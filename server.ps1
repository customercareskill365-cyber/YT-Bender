param(
  [int]$Port = 8080,
  [switch]$NoBrowser
)

$ErrorActionPreference = "SilentlyContinue"
$ServerStartTime = Get-Date
$RootDir = [System.IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
$DataDir = Join-Path $RootDir "data"
$DefaultDriveDir = Join-Path $RootDir "GoogleDrive_Sync"
$DbFile = Join-Path $DataDir "yt_studio_db.json"
$LogFile = Join-Path $DataDir "server.log"
$CurrentCorsOrigin = "http://localhost:$Port"

if (-not (Test-Path $DataDir)) {
  New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}
if (-not (Test-Path $DefaultDriveDir)) {
  New-Item -ItemType Directory -Path $DefaultDriveDir -Force | Out-Null
}

function Write-ServerLog([string]$Level, [string]$Endpoint, [string]$Detail) {
  try {
    $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $cleanDetail = ($Detail -replace "[\r\n]+", " ").Trim()
    $line = "[$ts] [$($Level.ToUpper())] [$Endpoint] $cleanDetail"
    $existing = @()
    if (Test-Path $LogFile) {
      $existing = @(Get-Content -Path $LogFile -Encoding UTF8)
    }
    $existing += $line
    if ($existing.Count -gt 200) {
      $existing = $existing[($existing.Count - 200)..($existing.Count - 1)]
    }
    [System.IO.File]::WriteAllLines($LogFile, [string[]]$existing, [System.Text.Encoding]::UTF8)
  } catch {}
}

function Resolve-CorsOrigin([string]$HeaderText, [int]$DefaultPort) {
  $defaultOrigin = "http://localhost:$DefaultPort"
  if ([string]::IsNullOrWhiteSpace($HeaderText)) {
    return $defaultOrigin
  }
  if ($HeaderText -match "(?im)^Origin:\s*([^\r\n]+)") {
    $candidate = $Matches[1].Trim()
    if ($candidate -match "^https?://(localhost|127\.0\.0\.1)(:\d+)?$") {
      return $candidate
    }
  }
  return $defaultOrigin
}

function Resolve-SafeDriveFolder([string]$CandidatePath) {
  if ([string]::IsNullOrWhiteSpace($CandidatePath)) {
    return $DefaultDriveDir
  }
  if ($CandidatePath -match "\.\.") {
    Write-ServerLog "WARN" "/api/drive" "Rejected path containing traversal sequence: $CandidatePath"
    return $DefaultDriveDir
  }
  try {
    $full = [System.IO.Path]::GetFullPath($CandidatePath)
    if ($full -match "^[A-Za-z]:\\?$") {
      Write-ServerLog "WARN" "/api/drive" "Rejected bare drive root path: $full"
      return $DefaultDriveDir
    }
    $blockedPrefixes = @(
      "C:\Windows",
      "C:\Program Files",
      "C:\Program Files (x86)",
      "C:\ProgramData",
      "C:\System Volume Information"
    )
    if ($env:WINDIR) { $blockedPrefixes += $env:WINDIR }
    if ($env:SystemRoot) { $blockedPrefixes += $env:SystemRoot }
    foreach ($prefix in $blockedPrefixes) {
      if (-not [string]::IsNullOrWhiteSpace($prefix) -and $full.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-ServerLog "WARN" "/api/drive" "Rejected restricted system folder path: $full"
        return $DefaultDriveDir
      }
    }
    return $full
  } catch {
    Write-ServerLog "WARN" "/api/drive" "Failed to resolve folder path '$CandidatePath', defaulting to $DefaultDriveDir"
    return $DefaultDriveDir
  }
}

function ConvertTo-NumericViews([string]$ViewsText) {
  if ([string]::IsNullOrWhiteSpace($ViewsText)) { return 0 }
  $clean = $ViewsText.ToUpper().Replace(",", "").Trim()
  if ($clean -match "(\d+(?:\.\d+)?)\s*([KMB])?") {
    $num = [double]$Matches[1]
    $suffix = if ($Matches.Count -ge 3) { $Matches[2] } else { "" }
    switch ($suffix) {
      "K" { return [long]($num * 1000) }
      "M" { return [long]($num * 1000000) }
      "B" { return [long]($num * 1000000000) }
      default { return [long]$num }
    }
  }
  return 0
}

function Format-CompactViews([long]$Views, [string]$FallbackText) {
  if ($Views -ge 1000000000) {
    return "$([math]::Round($Views / 1000000000.0, 1))B views"
  }
  if ($Views -ge 1000000) {
    return "$([math]::Round($Views / 1000000.0, 1))M views"
  }
  if ($Views -ge 1000) {
    return "$([math]::Round($Views / 1000.0, 1))K views"
  }
  if ($Views -gt 0) {
    return "$Views views"
  }
  if (-not [string]::IsNullOrWhiteSpace($FallbackText)) {
    return $FallbackText
  }
  return "Trending Now"
}

function Write-HttpResponse($Stream, [int]$StatusCode, [string]$StatusText, [string]$ContentType, [byte[]]$BodyBytes) {
  if ($null -eq $BodyBytes) { $BodyBytes = [byte[]]@() }
  $corsOrigin = if ($CurrentCorsOrigin) { $CurrentCorsOrigin } else { "http://localhost:$Port" }
  $header = "HTTP/1.1 $StatusCode $StatusText`r`n" +
            "Content-Type: $ContentType`r`n" +
            "Content-Length: $($BodyBytes.Length)`r`n" +
            "Cache-Control: no-cache, no-store, must-revalidate`r`n" +
            "Access-Control-Allow-Origin: $corsOrigin`r`n" +
            "Access-Control-Allow-Methods: GET, POST, OPTIONS`r`n" +
            "Access-Control-Allow-Headers: Content-Type`r`n" +
            "Vary: Origin`r`n" +
            "Connection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($BodyBytes.Length -gt 0) {
    $Stream.Write($BodyBytes, 0, $BodyBytes.Length)
  }
  $Stream.Flush()
}

function Send-Json($Stream, $Obj, [int]$StatusCode = 200) {
  $json = $Obj | ConvertTo-Json -Depth 12 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $statusText = switch ($StatusCode) {
    200 { "OK" }
    400 { "Bad Request" }
    403 { "Forbidden" }
    404 { "Not Found" }
    500 { "Internal Server Error" }
    default { "OK" }
  }
  Write-HttpResponse $Stream $StatusCode $statusText "application/json; charset=utf-8" $bytes
}

function Get-OllamaStatus {
  $result = @{
    ollamaActive = $false
    ollamaModels = @()
  }
  try {
    $resp = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction Stop
    if ($resp -and $resp.models) {
      $result.ollamaActive = $true
      $result.ollamaModels = @($resp.models | ForEach-Object { $_.name })
      return $result
    }
  } catch {}

  $ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
  if (Test-Path $ollamaExe) {
    $result.ollamaActive = $true
    $result.ollamaModels = @("Ollama Installed Locally")
  }
  return $result
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
$url = "http://localhost:$Port/"

Write-ServerLog "INFO" "SERVER_START" "YTBender Studio server listening on $url"

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  YTBender Studio - Local Offline-First Server Active" -ForegroundColor Green
Write-Host "  URL:          $url" -ForegroundColor Yellow
Write-Host "  Local DB:     $DbFile" -ForegroundColor Gray
Write-Host "  Drive Sync:   $DefaultDriveDir" -ForegroundColor Gray
Write-Host "  Server Log:   $LogFile" -ForegroundColor Gray
Write-Host "==============================================================" -ForegroundColor Cyan

if (-not $NoBrowser) {
  Start-Process $url
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $stream.ReadTimeout = 5000

    # Read HTTP request headers & body
    $ms = New-Object System.IO.MemoryStream
    $buf = New-Object byte[] 8192
    $headerEndIdx = -1
    $contentLength = 0

    while ($true) {
      $read = $stream.Read($buf, 0, $buf.Length)
      if ($read -le 0) { break }
      $ms.Write($buf, 0, $read)
      $allBytes = $ms.ToArray()
      $rawStr = [System.Text.Encoding]::ASCII.GetString($allBytes)
      $headerEndIdx = $rawStr.IndexOf("`r`n`r`n")
      if ($headerEndIdx -ge 0) {
        $headerPart = $rawStr.Substring(0, $headerEndIdx)
        if ($headerPart -match "(?im)^Content-Length:\s*(\d+)") {
          $contentLength = [int]$Matches[1]
        }
        $headerByteLen = [System.Text.Encoding]::ASCII.GetByteCount($headerPart) + 4
        while ($ms.Length -lt ($headerByteLen + $contentLength)) {
          $r2 = $stream.Read($buf, 0, $buf.Length)
          if ($r2 -le 0) { break }
          $ms.Write($buf, 0, $r2)
        }
        break
      }
    }

    $fullBytes = $ms.ToArray()
    if ($fullBytes.Length -eq 0) {
      $client.Close()
      continue
    }

    $asciiAll = [System.Text.Encoding]::ASCII.GetString($fullBytes)
    $splitIdx = $asciiAll.IndexOf("`r`n`r`n")
    $headerText = if ($splitIdx -ge 0) { $asciiAll.Substring(0, $splitIdx) } else { $asciiAll }
    $CurrentCorsOrigin = Resolve-CorsOrigin $headerText $Port

    $headerLines = $headerText -split "`r`n"
    $reqLine = $headerLines[0] -split " "
    $method = $reqLine[0]
    $rawTarget = if ($reqLine.Length -gt 1) { $reqLine[1] } else { "/" }
    $path = ($rawTarget -split "\?")[0]

    $bodyText = ""
    if ($splitIdx -ge 0 -and $contentLength -gt 0) {
      $headerByteCount = [System.Text.Encoding]::ASCII.GetByteCount($headerText) + 4
      $bodyText = [System.Text.Encoding]::UTF8.GetString($fullBytes, $headerByteCount, $fullBytes.Length - $headerByteCount)
    }

    if ($method -eq "OPTIONS") {
      Write-HttpResponse $stream 204 "No Content" "text/plain" ([byte[]]@())
      $client.Close()
      continue
    }

    if ($path.StartsWith("/api/")) {
      Write-ServerLog "INFO" "$method $path" "Origin=$CurrentCorsOrigin ContentLength=$contentLength"
    }

    # API: Status
    if ($path -eq "/api/status") {
      $ollama = Get-OllamaStatus
      Send-Json $stream @{
        status = "ok"
        localServerActive = $true
        ollamaActive = $ollama.ollamaActive
        ollamaModels = $ollama.ollamaModels
        driveFolderPath = $DefaultDriveDir
      }
      $client.Close()
      continue
    }

    # API: Admin Diagnostic Logs (AUD-07)
    if ($path -eq "/api/admin/logs" -and $method -eq "GET") {
      $entries = @()
      if (Test-Path $LogFile) {
        $allLines = @(Get-Content -Path $LogFile -Encoding UTF8)
        if ($allLines.Count -gt 40) {
          $entries = $allLines[($allLines.Count - 40)..($allLines.Count - 1)]
        } else {
          $entries = $allLines
        }
      }
      $uptimeSpan = (Get-Date) - $ServerStartTime
      $uptimeFormatted = "{0}d {1}h {2}m {3}s" -f $uptimeSpan.Days, $uptimeSpan.Hours, $uptimeSpan.Minutes, $uptimeSpan.Seconds
      Send-Json $stream @{
        status = "ok"
        logFile = $LogFile
        entries = @($entries)
        serverUptime = $uptimeFormatted
        uptimeSeconds = [int][math]::Floor($uptimeSpan.TotalSeconds)
      }
      $client.Close()
      continue
    }

    # API: Database GET/POST
    if ($path -eq "/api/db") {
      if ($method -eq "GET") {
        if (Test-Path $DbFile) {
          $bytes = [System.IO.File]::ReadAllBytes($DbFile)
          Write-HttpResponse $stream 200 "OK" "application/json; charset=utf-8" $bytes
        } else {
          Send-Json $stream @{ empty = $true }
        }
      } elseif ($method -eq "POST") {
        [System.IO.File]::WriteAllText($DbFile, $bodyText, [System.Text.Encoding]::UTF8)
        Send-Json $stream @{ saved = $true; path = $DbFile }
      }
      $client.Close()
      continue
    }

    # API: Local Google Drive Folder Sync (AUD-02 Path Hardened)
    if ($path -eq "/api/drive/sync-local" -and $method -eq "POST") {
      $body = $bodyText | ConvertFrom-Json
      $requestedFolder = if ($body -and $body.folderPath) { [string]$body.folderPath } else { $DefaultDriveDir }
      $targetFolder = Resolve-SafeDriveFolder $requestedFolder
      if (-not (Test-Path $targetFolder)) {
        New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null
      }
      $mdPath = Join-Path $targetFolder "YT_Studio_Blueprint_and_Script.md"
      $csvPath = Join-Path $targetFolder "YT_Upload_Sequence_Calendar.csv"
      $jsonPath = Join-Path $targetFolder "YT_Studio_Full_Backup.json"

      if ($body.markdownSummary) {
        [System.IO.File]::WriteAllText($mdPath, $body.markdownSummary, [System.Text.Encoding]::UTF8)
      }
      if ($body.csvCalendar) {
        [System.IO.File]::WriteAllText($csvPath, $body.csvCalendar, [System.Text.Encoding]::UTF8)
      }
      if ($body.fullJson) {
        [System.IO.File]::WriteAllText($jsonPath, $body.fullJson, [System.Text.Encoding]::UTF8)
      }

      $fileDetails = @()
      foreach ($fp in @($mdPath, $csvPath, $jsonPath)) {
        if (Test-Path $fp) {
          $fi = Get-Item $fp
          $fileDetails += @{
            name = $fi.Name
            path = $fi.FullName
            sizeKb = [math]::Round($fi.Length / 1024, 1)
            updatedAt = $fi.LastWriteTime.ToString("hh:mm:ss tt")
          }
        }
      }

      Write-ServerLog "INFO" "/api/drive/sync-local" "Synced $($fileDetails.Count) files to $targetFolder"
      Send-Json $stream @{
        synced = $true
        folder = $targetFolder
        files = @($mdPath, $csvPath, $jsonPath)
        fileDetails = $fileDetails
      }
      $client.Close()
      continue
    }

    # API: Open Local Sync Folder in Windows File Explorer (AUD-02 Path Hardened)
    if ($path -eq "/api/drive/open-folder" -and $method -eq "POST") {
      $body = $bodyText | ConvertFrom-Json
      $requestedFolder = if ($body -and $body.folderPath) { [string]$body.folderPath } else { $DefaultDriveDir }
      $targetFolder = Resolve-SafeDriveFolder $requestedFolder
      if (-not (Test-Path $targetFolder)) {
        New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null
      }
      Start-Process explorer.exe -ArgumentList "`"$targetFolder`""
      Write-ServerLog "INFO" "/api/drive/open-folder" "Opened folder $targetFolder"
      Send-Json $stream @{ opened = $true; folder = $targetFolder }
      $client.Close()
      continue
    }

    # API: Create Windows Desktop Shortcut
    if ($path -eq "/api/system/create-shortcut" -and $method -eq "POST") {
      try {
        $desktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
        if (-not $desktopPath -or -not (Test-Path $desktopPath)) {
          $desktopPath = Join-Path $env:USERPROFILE "Desktop"
        }
        $shortcutPath = Join-Path $desktopPath "YTBender Studio.lnk"
        $wsh = New-Object -ComObject WScript.Shell
        $sc = $wsh.CreateShortcut($shortcutPath)
        $sc.TargetPath = Join-Path $AppRoot "Start-App.bat"
        $sc.WorkingDirectory = $AppRoot
        $icoPath = Join-Path $AppRoot "logo.ico"
        if (Test-Path $icoPath) {
          $sc.IconLocation = "$icoPath,0"
        }
        $sc.Description = "YTBender - YouTube Content & Trend Planning Studio"
        $sc.Save()
        Write-ServerLog "INFO" "/api/system/create-shortcut" "Created desktop shortcut at $shortcutPath"
        Send-Json $stream @{ success = $true; path = $shortcutPath }
      } catch {
        Write-ServerLog "ERROR" "/api/system/create-shortcut" "Failed creating shortcut: $($_.Exception.Message)"
        Send-Json $stream @{ success = $false; error = $_.Exception.Message } 500 "Internal Server Error"
      }
      $client.Close()
      continue
    }

    # API: YouTube Public Search & Outlier Scraper (AUD-04)
    if ($path -eq "/api/youtube/search" -and $method -eq "POST") {
      $body = $bodyText | ConvertFrom-Json
      $rawQuery = if ($body -and $body.query) { [string]$body.query } else { "YouTube creator growth" }
      $q = [uri]::EscapeDataString($rawQuery)
      $ytUrl = "https://www.youtube.com/results?search_query=$q"
      $rawItems = @()
      $scrapeError = $null

      try {
        $reqHeaders = @{
          "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
          "Accept-Language" = "en-US,en;q=0.9"
          "Cookie" = "CONSENT=YES+cb.20210328-17-p0.en+FX+417"
        }
        $html = Invoke-WebRequest -Uri $ytUrl -Headers $reqHeaders -UseBasicParsing -TimeoutSec 8 -ErrorAction Stop
        $content = [string]$html.Content

        $vrMatches = [regex]::Matches($content, '"videoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})"')
        $seen = @{}

        foreach ($m in $vrMatches) {
          if ($rawItems.Count -ge 10) { break }
          $vid = $m.Groups[1].Value
          if ($seen.ContainsKey($vid)) { continue }

          $startPos = $m.Index
          $chunkLen = [math]::Min(4500, $content.Length - $startPos)
          $chunk = $content.Substring($startPos, $chunkLen)

          # Extract title
          $titleVal = ""
          if ($chunk -match '"title":\{"runs":\[\{"text":"((?:\\.|[^"\\])+)"') {
            $titleVal = $Matches[1]
          } elseif ($chunk -match '"title":\{"simpleText":"((?:\\.|[^"\\])+)"') {
            $titleVal = $Matches[1]
          }
          $titleVal = $titleVal -replace '\\u0026', '&' -replace '\\"', '"' -replace '\\\\', '\'
          if ([string]::IsNullOrWhiteSpace($titleVal) -or $titleVal.Length -lt 5) { continue }

          # Extract channel name
          $channelVal = "YouTube Creator"
          if ($chunk -match '"ownerText":\{"runs":\[\{"text":"([^"]+)"') {
            $channelVal = $Matches[1]
          } elseif ($chunk -match '"longBylineText":\{"runs":\[\{"text":"([^"]+)"') {
            $channelVal = $Matches[1]
          } elseif ($chunk -match '"shortBylineText":\{"runs":\[\{"text":"([^"]+)"') {
            $channelVal = $Matches[1]
          }
          $channelVal = $channelVal -replace '\\u0026', '&' -replace '\\"', '"'

          # Extract viewsText
          $viewsTextVal = "Trending Now"
          if ($chunk -match '"viewCountText":\{"simpleText":"([^"]+)"') {
            $viewsTextVal = $Matches[1]
          } elseif ($chunk -match '"shortViewCountText":\{"simpleText":"([^"]+)"') {
            $viewsTextVal = $Matches[1]
          } elseif ($chunk -match '"shortViewCountText":\{"runs":\[\{"text":"([^"]+)"') {
            $viewsTextVal = $Matches[1]
          }

          # Extract publishedAt
          $publishedAtVal = "Recent"
          if ($chunk -match '"publishedTimeText":\{"simpleText":"([^"]+)"') {
            $publishedAtVal = $Matches[1]
          }

          $seen[$vid] = $true
          $viewsNum = ConvertTo-NumericViews $viewsTextVal

          $rawItems += @{
            videoId = $vid
            title = $titleVal
            channel = $channelVal
            viewsText = $viewsTextVal
            viewsNumeric = $viewsNum
            publishedAt = $publishedAtVal
            watchUrl = "https://www.youtube.com/watch?v=$vid"
            isLive = $true
            format = if ($titleVal -match "(?i)#?short") { "Short-form (9:16)" } else { "Long-form (16:9)" }
          }
        }
      } catch {
        $scrapeError = $_.Exception.Message
        Write-ServerLog "ERROR" "/api/youtube/search" "YouTube scrape failed for query '$rawQuery': $scrapeError"
      }

      # Compute median views & outlierScore across the batch
      $items = @()
      if ($rawItems.Count -gt 0) {
        $positiveViews = @($rawItems | ForEach-Object { [long]$_.viewsNumeric } | Where-Object { $_ -gt 0 } | Sort-Object)
        $medianViews = 25000
        if ($positiveViews.Count -gt 0) {
          $mid = [int][math]::Floor($positiveViews.Count / 2)
          if (($positiveViews.Count % 2) -eq 1) {
            $medianViews = [double]$positiveViews[$mid]
          } else {
            $medianViews = ([double]$positiveViews[$mid - 1] + [double]$positiveViews[$mid]) / 2.0
          }
          if ($medianViews -le 0) { $medianViews = 25000 }
        }

        foreach ($it in $rawItems) {
          $vNum = [double]$it.viewsNumeric
          $mult = if ($vNum -gt 0 -and $medianViews -gt 0) { [math]::Round($vNum / $medianViews, 1) } else { 1.0 }
          if ($mult -lt 0.1) { $mult = 0.1 }
          $outlierLabel = "$($mult)x Outlier"
          $compactViews = Format-CompactViews ([long]$it.viewsNumeric) $it.viewsText
          $it.outlierScore = $outlierLabel
          $it.outlierMultiplier = $mult
          $redDot = [char]::ConvertFromUtf32(0x1F534)
          $bullet = [char]0x2022
          $it.signal = "$redDot Live $bullet $outlierLabel $bullet $compactViews"
          $items += $it
        }
      }

      Write-ServerLog "INFO" "/api/youtube/search" "Query='$rawQuery' returned $($items.Count) items"
      Send-Json $stream @{
        source = if ($items.Count -gt 0) { "Live YouTube Search Feed" } else { "Offline Fallback" }
        items = $items
        error = $scrapeError
      }
      $client.Close()
      continue
    }

    # API: Unified Multi-Provider AI Proxy (AUD-06)
    if ($path -eq "/api/ai/generate" -and $method -eq "POST") {
      $body = $bodyText | ConvertFrom-Json
      $provider = if ($body -and $body.provider) { ([string]$body.provider).ToLower() } else { "offline" }
      $sys = if ($body -and $body.systemPrompt) { [string]$body.systemPrompt } else { "" }
      $usr = if ($body -and $body.userPrompt) { [string]$body.userPrompt } else { "" }
      $s = if ($body -and $body.settings) { $body.settings } else { @{} }
      $outText = ""
      $apiError = $null

      try {
        if ($provider -eq "claude") {
          if (-not $s.claudeKey) {
            throw "Anthropic Claude API key is not configured."
          }
          $headers = @{
            "x-api-key" = [string]$s.claudeKey
            "anthropic-version" = "2023-06-01"
            "content-type" = "application/json"
          }
          $payload = @{
            model = if ($s.claudeModel) { [string]$s.claudeModel } else { "claude-3-7-sonnet-latest" }
            max_tokens = 1800
            system = $sys
            messages = @(@{ role = "user"; content = $usr })
          } | ConvertTo-Json -Depth 6
          $apiRes = Invoke-RestMethod -Uri "https://api.anthropic.com/v1/messages" -Method Post -Headers $headers -Body $payload -TimeoutSec 25 -ErrorAction Stop
          $outText = [string]$apiRes.content[0].text
        }
        elseif ($provider -eq "openai") {
          if (-not $s.openaiKey) {
            throw "OpenAI API key is not configured."
          }
          $headers = @{
            "Authorization" = "Bearer $($s.openaiKey)"
            "Content-Type" = "application/json"
          }
          $payload = @{
            model = if ($s.openaiModel) { [string]$s.openaiModel } else { "gpt-4o-mini" }
            messages = @(
              @{ role = "system"; content = $sys },
              @{ role = "user"; content = $usr }
            )
          } | ConvertTo-Json -Depth 6
          $apiRes = Invoke-RestMethod -Uri "https://api.openai.com/v1/chat/completions" -Method Post -Headers $headers -Body $payload -TimeoutSec 25 -ErrorAction Stop
          $outText = [string]$apiRes.choices[0].message.content
        }
        elseif ($provider -eq "gemini") {
          if (-not $s.geminiKey) {
            throw "Google Gemini API key is not configured."
          }
          $model = if ($s.geminiModel) { [string]$s.geminiModel } else { "gemini-2.5-flash" }
          $geminiUri = "https://generativelanguage.googleapis.com/v1beta/models/$($model):generateContent?key=$([uri]::EscapeDataString([string]$s.geminiKey))"
          $payload = @{
            contents = @(
              @{
                parts = @(
                  @{ text = "$sys`n`n$usr" }
                )
              }
            )
          } | ConvertTo-Json -Depth 8
          $apiRes = Invoke-RestMethod -Uri $geminiUri -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 25 -ErrorAction Stop
          $outText = [string]$apiRes.candidates[0].content.parts[0].text
        }
        elseif ($provider -eq "ollama") {
          $ollamaBase = if ($s.ollamaUrl) { ([string]$s.ollamaUrl).TrimEnd("/") } else { "http://localhost:11434" }
          $ollamaModel = if ($s.ollamaModel) { [string]$s.ollamaModel } else { "llama3.2" }
          $payload = @{
            model = $ollamaModel
            prompt = "$sys`n`n$usr"
            stream = $false
          } | ConvertTo-Json -Depth 6
          $apiRes = Invoke-RestMethod -Uri "$ollamaBase/api/generate" -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 30 -ErrorAction Stop
          $outText = [string]$apiRes.response
        }
        else {
          throw "Unsupported AI provider '$provider'."
        }
      } catch {
        $apiError = $_.Exception.Message
        Write-ServerLog "ERROR" "/api/ai/generate" "Provider=$provider failed: $apiError"
      }

      if (-not $apiError) {
        Write-ServerLog "INFO" "/api/ai/generate" "Provider=$provider succeeded ($($outText.Length) chars)"
      }

      Send-Json $stream @{
        providerUsed = $provider.ToUpper()
        text = $outText
        error = $apiError
      }
      $client.Close()
      continue
    }

    # Static File Serving (AUD-02 Directory Traversal Guard)
    $relPath = if ($path -eq "/") { "index.html" } else { [uri]::UnescapeDataString($path).TrimStart("/").Replace("/", "\") }
    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $RootDir $relPath))

    if (-not $fullPath.StartsWith($RootDir, [System.StringComparison]::OrdinalIgnoreCase)) {
      Write-ServerLog "WARN" "STATIC_TRAVERSAL" "Blocked path traversal attempt: $path -> $fullPath"
      Write-HttpResponse $stream 403 "Forbidden" "text/plain" ([System.Text.Encoding]::UTF8.GetBytes("Forbidden"))
      $client.Close()
      continue
    }

    if (Test-Path $fullPath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
      $mime = switch ($ext) {
        ".html" { "text/html; charset=utf-8" }
        ".css"  { "text/css; charset=utf-8" }
        ".js"   { "application/javascript; charset=utf-8" }
        ".json" { "application/json; charset=utf-8" }
        ".svg"  { "image/svg+xml" }
        ".png"  { "image/png" }
        ".jpg"  { "image/jpeg" }
        ".jpeg" { "image/jpeg" }
        ".webp" { "image/webp" }
        ".ico"  { "image/x-icon" }
        default { "application/octet-stream" }
      }
      $bytes = [System.IO.File]::ReadAllBytes($fullPath)
      Write-HttpResponse $stream 200 "OK" $mime $bytes
    } else {
      Write-HttpResponse $stream 404 "Not Found" "text/plain" ([System.Text.Encoding]::UTF8.GetBytes("Not Found"))
    }
  } catch {
    Write-ServerLog "ERROR" "REQUEST_LOOP" $_.Exception.Message
  } finally {
    try { $client.Close() } catch {}
  }
}
