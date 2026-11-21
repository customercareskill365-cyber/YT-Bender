/**
 * Offline Intelligence & Deterministic Creative Studio Engine
 * Provides 100% offline YouTube niche trend intelligence, topic generation,
 * creative blueprints (Tone, Pacing, Script Style, Video Style, Language, Format, Code-Switch Mix),
 * full timestamped script generation (both Long-form and 45s Vertical Shorts with multi-template variety),
 * natural spoken hook extraction, monetization & sponsorship estimators, title packaging scorer,
 * and interconnected Short <-> Long-Form upload sequences.
 */

window.OfflineIntelligence = (function () {
  const NICHES = {
    "Tech & AI Tools": {
      category: "Technology",
      avgRpm: "$8.50 - $18.00",
      velocity: 96,
      competition: "Medium-High",
      bestFormatMix: "60% Long-Form (8-14m) / 40% Shorts (45s)",
      sweetSpotDuration: "10m 30s (Long) | 48s (Short)",
      topAngles: [
        "Free Local/Offline AI Workflow Replacements",
        "Hidden Automation Tools Saving 10+ Hours/Week",
        "Side-by-Side Real-World Benchmark (Hype vs Reality)",
        "Build a Full App/System in 15 Minutes Step-by-Step"
      ],
      trendingKeywords: ["Offline AI", "Local LLM", "AI Agents", "Zero Cost Workflow", "Automation Stack", "Productivity Hacks"],
      recommendedTone: "High-Energy Investigative & Practical Mentor",
      recommendedPacing: "Fast J-Cuts (Cut every 3-5s in Intro, 8-12s in Demo, Pattern Interrupt every 45s)",
      recommendedScriptStyle: "Problem -> Live Proof in First 15s -> Step-by-Step Breakdown -> Pro Caveat",
      recommendedVideoStyle: "A-Roll Talking Head + Crisp 4K Screen Recording Zooms + Motion Graphic Callouts"
    },
    "Personal Finance & Investing": {
      category: "Finance",
      avgRpm: "$14.00 - $32.00",
      velocity: 91,
      competition: "High",
      bestFormatMix: "70% Long-Form (12-18m) / 30% Shorts (50s)",
      sweetSpotDuration: "13m 45s (Long) | 52s (Short)",
      topAngles: [
        "The Silent Wealth Killer Nobody Calculates",
        "Real Portfolio Breakdown by Income Bracket",
        "3 Financial Rules That Changed After 2025",
        "Step-by-Step Cashflow System for Beginners"
      ],
      trendingKeywords: ["Index Funds", "Tax Optimization", "Passive Cashflow", "Middle Class Trap", "Compounding Math", "Emergency Corpus"],
      recommendedTone: "Calm, Analytical, Trustworthy & Data-Backed",
      recommendedPacing: "Measured Authority (145 WPM, Visual Chart/Whiteboard transition every 6-9s)",
      recommendedScriptStyle: "Myth Buster -> Real Number Calculation -> 3-Step Action Framework",
      recommendedVideoStyle: "Clean Studio Talking Head + Interactive Spreadsheet/Chart Overlays + Minimalist B-Roll"
    },
    "Video Editing & Content Creation": {
      category: "Creator Economy",
      avgRpm: "$7.20 - $15.40",
      velocity: 94,
      competition: "Medium",
      bestFormatMix: "50% Long-Form (9-15m) / 50% Shorts (38s)",
      sweetSpotDuration: "11m 15s (Long) | 40s (Short)",
      topAngles: [
        "DaVinci Resolve Viral Retention Editing Breakdown",
        "How Top Creators Hook Viewers in the First 3 Seconds",
        "Sound Design & Pacing Secrets That Double Watch Time",
        "Zero-Budget Studio Lighting & Mic Chain Setup"
      ],
      trendingKeywords: ["DaVinci Resolve", "Retention Editing", "Sound Design", "Pacing Secrets", "Color Grading", "OBS Setup"],
      recommendedTone: "Fast-Paced Creative Insider & Visual Storyteller",
      recommendedPacing: "Ultra-Snappy (0:00-0:15 visual hook every 1.8s, Timeline breakdown every 5-7s)",
      recommendedScriptStyle: "Before/After Comparison -> Deconstruct the Timeline -> Live Recreation -> Preset Tip",
      recommendedVideoStyle: "Split-Screen Timeline + Final Render Preview + Dynamic Sound FX Layering"
    },
    "Gaming & Esports Lore": {
      category: "Gaming",
      avgRpm: "$3.50 - $7.80",
      velocity: 92,
      competition: "High",
      bestFormatMix: "45% Long-Form (15-28m) / 55% Shorts (45s)",
      sweetSpotDuration: "18m 20s (Long) | 45s (Short)",
      topAngles: [
        "The Impossible Challenge Run Nobody Thought Was Possible",
        "Hidden Lore Details You Missed in the Latest Update",
        "Why This Underrated Mechanic Breaks the Entire Meta",
        "Evolution of a Legendary Franchise (Documentary)"
      ],
      trendingKeywords: ["Secret Boss", "Challenge Run", "Meta Breakdown", "Speedrun Strat", "Hidden Lore", "FPS Optimization"],
      recommendedTone: "Dramatic Narrative & Witty High-Stakes Commentary",
      recommendedPacing: "High-Adrenaline (165+ WPM, Beat-synced cuts, Tension build-up pauses)",
      recommendedScriptStyle: "Stakes Setup -> Escalating Obstacles -> Climax Boss/Challenge -> Twist Ending",
      recommendedVideoStyle: "High-Bitrate 60fps Gameplay + Subtle Facecam Reactions + Custom Map/HUD Zooms"
    },
    "Coding & Software Engineering": {
      category: "Development",
      avgRpm: "$9.00 - $21.00",
      velocity: 90,
      competition: "Medium",
      bestFormatMix: "65% Long-Form (10-20m) / 35% Shorts (50s)",
      sweetSpotDuration: "12m 50s (Long) | 49s (Short)",
      topAngles: [
        "Why Senior Engineers Are Ditching Complex Frameworks",
        "Build a Production Local-First App From Scratch",
        "System Design Breakdown of a 10M-User Architecture",
        "5 Debugging Habits That Separate Juniors from Seniors"
      ],
      trendingKeywords: ["Local-First", "SQLite in Production", "System Design", "Clean Architecture", "Full-Stack Project", "Dev Tooling"],
      recommendedTone: "Pragmatic, Opinionated & Senior-Engineer Direct",
      recommendedPacing: "Structured Flow (150 WPM, Architecture Diagram -> Code Block -> Live Terminal Output)",
      recommendedScriptStyle: "Architectural Bottleneck -> Visual Diagram -> Code Implementation -> Benchmark",
      recommendedVideoStyle: "Excalidraw/Mermaid Architecture Canvas + High-Contrast IDE Zoom + Terminal Proof"
    },
    "Health, Fitness & Biohacking": {
      category: "Lifestyle & Health",
      avgRpm: "$6.50 - $14.00",
      velocity: 89,
      competition: "Medium-High",
      bestFormatMix: "50% Long-Form (8-12m) / 50% Shorts (35s)",
      sweetSpotDuration: "9m 40s (Long) | 38s (Short)",
      topAngles: [
        "30-Day Science-Backed Protocol (Real Bloodwork/Results)",
        "The Morning Routine Mistake Wrecking Your Energy",
        "Minimalist Home Training Plan for Busy Professionals",
        "High-Protein Budget Meal Prep Under 20 Minutes"
      ],
      trendingKeywords: ["Zone 2 Cardio", "Sleep Architecture", "Metabolic Health", "Minimalist Workout", "Dopamine Reset", "Meal Prep"],
      recommendedTone: "Empathetic, Science-Backed & Action-Oriented Coach",
      recommendedPacing: "Energetic & Visual (150 WPM, Anatomical/Study Graphic + Real Demo B-Roll every 4s)",
      recommendedScriptStyle: "Common Symptom -> Scientific Root Cause -> 3-Tier Daily Protocol",
      recommendedVideoStyle: "Crisp Natural-Light A-Roll + Study Citation Overlays + POV Action B-Roll"
    },
    "Business Case Studies & Documentaries": {
      category: "Business",
      avgRpm: "$11.00 - $24.00",
      velocity: 95,
      competition: "Medium",
      bestFormatMix: "60% Long-Form (14-22m) / 40% Shorts (55s)",
      sweetSpotDuration: "16m 10s (Long) | 56s (Short)",
      topAngles: [
        "How an Unknown Startup Quietly Captured a $10B Market",
        "The Fatal Strategic Mistake That Sank a Market Giant",
        "The Untold Economics Behind Everyday Monopoly Products",
        "How This Founder Built a $5M/Yr Solo Business"
      ],
      trendingKeywords: ["Unit Economics", "Monopoly Strategy", "Rise and Fall", "Founder Story", "Distribution Moat", "Bootstrapped"],
      recommendedTone: "Cinematic Investigative Documentary & Suspenseful",
      recommendedPacing: "Cinematic Pulse (140 WPM, Dramatic Pauses, Chapter Transitions every 3 mins)",
      recommendedScriptStyle: "Cold Open Mystery -> Origin Story -> The Turning Point -> Financial Autopsy -> Lesson",
      recommendedVideoStyle: "Dark-Mode 3D Map/Timeline Animations + Archival Clips + Newspaper/Chart Parallax"
    }
  };

  const LANGUAGE_PROFILES = {
    "English (Global)": {
      code: "en",
      regionDefault: "US / Global",
      hookTemplates: [
        "Most people approaching {topic} get this one critical step completely backwards...",
        "I tested the top {topic} workflows for 30 days so you don't waste your time—here is what actually worked.",
        "Stop using outdated methods for {topic}. Here is the exact 2026 blueprint."
      ],
      ctaStyle: "Check the pinned resource and watch the next part linked on screen right now.",
      titleStrategy: "Punchy 45-55 chars in English, high-contrast 2-3 word thumbnail text.",
      culturalNotes: "Prioritize immediate proof within 8 seconds; zero throat-clearing intro."
    },
    "Hinglish (Hindi + English Creator Mix)": {
      code: "hi-Latn",
      regionDefault: "India (IN)",
      hookTemplates: [
        "Agar aap abhi bhi {topic} purane tarike se kar rahe ho, toh you're losing 80% output—let me show you why!",
        "Maine {topic} ke top workflows ko test kiya, aur jo result aaya wo sach mein insane hai.",
        "99% creators {topic} mein yeh ek mistake karte hain—chaliye isko step-by-step fix karte hain."
      ],
      ctaStyle: "Agar yeh workflow kaam aaya toh comment mein 'BLUEPRINT' likho, aur screen pe dikh rahe next video pe click karo!",
      titleStrategy: "English Title for Search SEO + Hinglish Emotional Curiosity Hook in Thumbnail (2-3 bold words).",
      culturalNotes: "Keep technical terms in English (workflow, retention, algorithm, setup) and emotional/connector phrases in conversational Hindi."
    },
    "Tanglish (Tamil + English Creator Mix)": {
      code: "ta-Latn",
      regionDefault: "India (IN)",
      hookTemplates: [
        "Neenga innum {topic}-ku old method use panringana, 80% output miss panringa—epdi fix panradhu nu paakalam!",
        "Naan {topic} oda top workflows-ah 30 days test pannen, vandha result unmaiyave vera level!",
        "99% creators {topic}-la indha oru mistake dhaan panranga—vaanga step-by-step ah decode panlam."
      ],
      ctaStyle: "Indha workflow ungaluku useful-ah irundha comment-la 'BLUEPRINT' nu podunga, apdiye screen-la iruka next video-va click pannunga!",
      titleStrategy: "Clear English Search Title + Punchy Tanglish/Tamil 2-3 Word Thumbnail Curiosity Badge.",
      culturalNotes: "Blend high-clarity English technical terms with energetic Chennai/Coimbatore creator conversational Tamil cadence."
    },
    "Hindi (हिन्दी)": {
      code: "hi",
      regionDefault: "India (IN)",
      hookTemplates: [
        "क्या आप जानते हैं कि {topic} में 90% लोग एक ही जगह गलती करते हैं? आइए आज इसे पूरी तरह समझते हैं।",
        "मैंने पिछले 30 दिनों तक {topic} के हर तरीके को परखा—और यह हैं 3 सबसे असरदार तरीके।",
        "बिना समय गंवाए {topic} को मास्टर करने का सबसे सटीक ब्लूप्रिंट यहाँ है।"
      ],
      ctaStyle: "अगला भाग अभी स्क्रीन पर दिख रहा है—उस पर क्लिक करें और अपनी राय कमेंट में ज़रूर बताएं।",
      titleStrategy: "Bilingual Title (English keyword + Hindi hook) with Bold Devanagari 2-word Thumbnail text.",
      culturalNotes: "Storytelling analogies and real-life relatable examples dramatically boost mid-video retention."
    },
    "Spanish (Español)": {
      code: "es",
      regionDefault: "LATAM / Spain",
      hookTemplates: [
        "El 95% de las personas comete este error al intentar dominar {topic}...",
        "Probé {topic} durante 30 días y esto fue lo único que realmente funcionó.",
        "Olvídate de los métodos antiguos para {topic}: aquí tienes el sistema definitivo."
      ],
      ctaStyle: "Haz clic en el video en pantalla para ver la segunda parte del sistema.",
      titleStrategy: "Clear curiosity-driven Spanish title under 55 characters + 2 bold impact words on thumbnail.",
      culturalNotes: "High warmth, clear visual demonstrations, and energetic vocal inflection in the first 15 seconds."
    }
  };

  const CODE_SWITCH_OPTIONS = [
    "Balanced Creator Mix (50% Native / 50% English Tech Terms)",
    "Storytelling Native-Heavy (75% Native / 25% English)",
    "Technical English-Heavy (25% Native / 75% English)",
    "100% Pure Selected Language"
  ];

  const TONE_OPTIONS = [
    "High-Energy Investigative & Practical Mentor",
    "Calm, Analytical, Trustworthy & Data-Backed",
    "Fast-Paced Creative Insider & Visual Storyteller",
    "Cinematic Investigative Documentary & Suspenseful",
    "Conversational Relatable Friend (No-Fluff)",
    "Pragmatic, Opinionated & Contrarian Challenger"
  ];

  const PACING_OPTIONS = [
    "Fast J-Cuts (Cut every 3-5s in Intro, 8-12s in Body, Pattern Interrupt every 45s)",
    "Ultra-Snappy Retention (Visual change every 2-4s, 165 WPM, Beat-synced transitions)",
    "Measured Authority (145 WPM, Chart/Visual transition every 7-10s, Breathing room pauses)",
    "Cinematic Documentary Pulse (140 WPM, Dramatic pauses, 3-Act chapter transitions)",
    "Shorts Hyper-Loop (175 WPM, 1.5s visual cuts, Seamless loop back to 0:00)"
  ];

  const SCRIPT_STYLE_OPTIONS = [
    "Problem -> Live Proof in First 15s -> Step-by-Step Breakdown -> Pro Caveat",
    "Open Mystery Loop -> Story Escalation -> Data Reveal -> Actionable Takeaway",
    "Myth Buster -> Real Number Calculation -> 3-Step Action Framework",
    "Before/After Comparison -> Deconstruct the System -> Live Recreation",
    "Contrarian Hook -> Why Standard Advice Fails -> The New Blueprint"
  ];

  const VIDEO_STYLE_OPTIONS = [
    "A-Roll Talking Head + Crisp 4K Screen Recording Zooms + Motion Graphic Callouts",
    "Faceless Dark-Mode Documentary + 3D Canvas/Timeline + Archival Parallax",
    "Split-Screen Timeline + Live Demo + Dynamic Sound FX Layering",
    "Clean Studio Talking Head + Interactive Excalidraw/Whiteboard Overlays",
    "Vertical 9:16 Kinetic Captions + Split Top/Bottom Visual Proof (Shorts)"
  ];

  /**
   * SOL-14: Smart Topic Subject Extractor
   * Sanitizes verbose 15-word video titles into natural, speakable 2-5 word subjects
   * so hooks never sound robotic when read aloud.
   */
  function extractSpeakableSubject(rawTitle, fallbackNiche) {
    if (!rawTitle) return fallbackNiche || "this workflow";
    let s = String(rawTitle)
      .replace(/^\[short\]\s*/i, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/—.*$/g, "")
      .replace(/:.*$/g, "")
      .replace(/#shorts?/gi, "")
      .trim();

    const prefixPatterns = [
      /^how to master\s+/i,
      /^how i built a\s+/i,
      /^90%\s+of\s+people\s+do\s+/i,
      /^why\s+90%\s+fail\s+at\s+/i,
      /^i tested\s+\d+\s+viral\s+/i,
      /^i tested\s+/i,
      /^the\s+1\s+hidden\s+setting\s+in\s+/i,
      /^the\s+#1\s+secret\s+from\s+our\s+/i,
      /^the\s+ultimate\s+\d*\s*/i,
      /^3\s+/i,
      /^stop\s+/i
    ];
    prefixPatterns.forEach(rx => {
      s = s.replace(rx, "");
    });

    const suffixPatterns = [
      /\s+without paid tools.*$/i,
      /\s+backwards.*$/i,
      /\s+strategies for \d+ days.*$/i,
      /\s+that doubles output instantly.*$/i,
      /\s+roadmap.*$/i,
      /\s+mistakes costing you hours.*$/i,
      /\s+myths tested side-by-side.*$/i,
      /\s+breakdown$/i
    ];
    suffixPatterns.forEach(rx => {
      s = s.replace(rx, "");
    });

    s = s.trim();
    if (!s || s.split(/\s+/).length > 6) {
      return fallbackNiche || "this system";
    }
    return s;
  }

  function deriveDefaultThumbBadge(titleStr) {
    const t = String(titleStr || "").toLowerCase();
    if (t.includes("without paid") || t.includes("free") || t.includes("zero")) return "ZERO COST FIX";
    if (t.includes("90%") || t.includes("backwards") || t.includes("mistake")) return "99% MISS THIS";
    if (t.includes("tested") || t.includes("30 days") || t.includes("data")) return "BRUTAL DATA";
    if (t.includes("setting") || t.includes("doubles") || t.includes("secret")) return "10X SECRET";
    if (t.includes("roadmap") || t.includes("top 1%")) return "2026 BLUEPRINT";
    return "REAL PROOF";
  }

  function getNicheProfile(nicheName) {
    if (NICHES[nicheName]) return NICHES[nicheName];
    const keys = Object.keys(NICHES);
    const match = keys.find(k => k.toLowerCase().includes((nicheName || "").toLowerCase()));
    if (match) return NICHES[match];

    const clean = (nicheName || "Custom Niche").trim();
    return {
      category: "Custom Creator Niche",
      avgRpm: "$6.00 - $15.00",
      velocity: 88,
      competition: "Medium",
      bestFormatMix: "55% Long-Form (10-14m) / 45% Shorts (45s)",
      sweetSpotDuration: "11m 00s (Long) | 45s (Short)",
      topAngles: [
        `The 2026 Complete Beginner-to-Pro System for ${clean}`,
        `I Tested the Top 5 ${clean} Methods for 30 Days (Honest Results)`,
        `Stop Making This Expensive Mistake in ${clean}`,
        `Behind the Scenes: My Exact ${clean} Workflow From Scratch`
      ],
      trendingKeywords: [clean, `${clean} Tutorial`, `${clean} 2026`, `Best ${clean} Setup`, `${clean} Mistakes`, `${clean} Workflow`],
      recommendedTone: TONE_OPTIONS[0],
      recommendedPacing: PACING_OPTIONS[0],
      recommendedScriptStyle: SCRIPT_STYLE_OPTIONS[0],
      recommendedVideoStyle: VIDEO_STYLE_OPTIONS[0]
    };
  }

  function generateTopicsForNiche(nicheName, language, region, formatFilter) {
    const profile = getNicheProfile(nicheName);
    const langProfile = LANGUAGE_PROFILES[language] || LANGUAGE_PROFILES["English (Global)"];
    const cleanNiche = (nicheName || "Tech & AI Tools").trim();

    const templates = [
      {
        title: `How to Master ${cleanNiche} Without Paid Tools (Complete Offline/Local System)`,
        angle: profile.topAngles[0] || "Zero-Cost High-Leverage System",
        format: "Both (Funnel Pair)",
        searchScore: 95,
        viralScore: 93,
        competition: "Low-Medium",
        estViewsPotential: "45K - 220K",
        funnelRole: "Pillar Long-Form + Teaser Short",
        recommendedOrder: 1,
        whyItWorks: `High search intent around "${profile.trendingKeywords[0]}" combined with low competition for practical system walkthroughs in ${region}.`
      },
      {
        title: `90% of People Do ${cleanNiche} Backwards — Do This in 45 Seconds Instead`,
        angle: "Contrarian Pattern Interrupt",
        format: "Short-form (9:16)",
        searchScore: 84,
        viralScore: 97,
        competition: "Medium",
        estViewsPotential: "120K - 650K",
        funnelRole: "Top-of-Funnel Discovery Short #1",
        recommendedOrder: 2,
        whyItWorks: "Triggers instant curiosity gap in the Shorts feed and funnels viewers directly to Pillar Video #1 via Related Video link."
      },
      {
        title: `I Tested 5 Viral ${cleanNiche} Strategies for 30 Days (Brutally Honest Data)`,
        angle: profile.topAngles[2] || "30-Day Experiment & Benchmark",
        format: "Long-form (16:9)",
        searchScore: 91,
        viralScore: 94,
        competition: "Medium",
        estViewsPotential: "60K - 310K",
        funnelRole: "Authority Builder Long-Form #2",
        recommendedOrder: 3,
        whyItWorks: "Experiment-driven thumbnails and side-by-side proof achieve 62%+ average view duration."
      },
      {
        title: `The 1 Hidden Setting in ${cleanNiche} That Doubles Output Instantly`,
        angle: "Quick-Win Secret",
        format: "Short-form (9:16)",
        searchScore: 88,
        viralScore: 92,
        competition: "Low",
        estViewsPotential: "80K - 400K",
        funnelRole: "Mid-Week Retention Short #2",
        recommendedOrder: 4,
        whyItWorks: "High save-to-view ratio on Shorts, signaling strong algorithmic satisfaction."
      },
      {
        title: `The Ultimate 2026 ${cleanNiche} Roadmap: From Zero to Top 1% Workflow`,
        angle: profile.topAngles[3] || "End-to-End Tier List & Roadmap",
        format: "Long-form (16:9)",
        searchScore: 96,
        viralScore: 90,
        competition: "Medium",
        estViewsPotential: "75K - 380K",
        funnelRole: "Evergreen Search Anchor Long-Form #3",
        recommendedOrder: 5,
        whyItWorks: "Captures year-round evergreen search traffic and acts as the channel binge-watch anchor."
      },
      {
        title: `3 ${cleanNiche} Mistakes Costing You Hours Every Single Week`,
        angle: "Mistake Avoidance / Fear of Missing Out",
        format: "Both (Funnel Pair)",
        searchScore: 89,
        viralScore: 91,
        competition: "Low-Medium",
        estViewsPotential: "50K - 190K",
        funnelRole: "Conversion Short + Deep-Dive Pair",
        recommendedOrder: 6,
        whyItWorks: `Negative-framing hook performs exceptionally well in ${langProfile.regionDefault} browse features.`
      }
    ];

    if (formatFilter && formatFilter !== "All") {
      return templates.filter(t => t.format.toLowerCase().includes(formatFilter.toLowerCase()) || t.format.includes("Both"));
    }
    return templates;
  }

  function generateBlueprint(topicObj, nicheName, language, customOverrides) {
    const safeTopic = topicObj || {};
    const overrides = customOverrides || {};
    const profile = getNicheProfile(nicheName);
    const langProfile = LANGUAGE_PROFILES[language] || LANGUAGE_PROFILES["English (Global)"];
    const fmtRaw = (overrides.format || safeTopic.format || "").toLowerCase();
    const isShortOnly = fmtRaw.includes("short") && !fmtRaw.includes("both");
    const topicTitle = overrides.topicTitle || safeTopic.title || `Mastering ${nicheName || "Tech & AI Tools"}`;

    return {
      topicTitle,
      speakableSubject: extractSpeakableSubject(topicTitle, nicheName),
      niche: nicheName || "Tech & AI Tools",
      format: overrides.format || (isShortOnly ? "Short-form (9:16 Vertical, 45-58s)" : (safeTopic.format || "Long-form (16:9 Widescreen, 10-14m)")),
      language: language || "English (Global)",
      codeSwitchMix: overrides.codeSwitchMix || safeTopic.codeSwitchMix || CODE_SWITCH_OPTIONS[0],
      thumbBadgeText: overrides.thumbBadgeText || safeTopic.thumbBadgeText || deriveDefaultThumbBadge(topicTitle),
      tone: overrides.tone || profile.recommendedTone,
      pacing: overrides.pacing || (isShortOnly
        ? "Shorts Hyper-Loop (175 WPM, Visual Cut every 1.5-2.5s, Audio Riser at 0:18, Seamless Loop Ending)"
        : profile.recommendedPacing),
      scriptStyle: overrides.scriptStyle || profile.recommendedScriptStyle,
      videoStyle: overrides.videoStyle || (isShortOnly
        ? "Vertical 9:16 Dynamic Split-Screen + Highlighted Keyword Captions + Zoom Punch-ins"
        : profile.recommendedVideoStyle),
      targetDuration: isShortOnly ? "45 Seconds (~115 Words)" : profile.sweetSpotDuration.split("|")[0].trim(),
      wpmTarget: isShortOnly ? "165 WPM" : "150 WPM",
      thumbnailAndTitleNotes: langProfile.titleStrategy,
      culturalAdaptation: langProfile.culturalNotes,
      pacingSegments: isShortOnly
        ? [
            { label: "0:00-0:03 Hook", pct: 15, color: "#ff3b5c", detail: "Visual Proof + Contrarian Claim" },
            { label: "0:03-0:18 Setup", pct: 30, color: "#4f6ef7", detail: "Fast Problem Breakdown (2s cuts)" },
            { label: "0:18-0:38 Core Value", pct: 40, color: "#10b981", detail: "3-Step Rapid Action Demo" },
            { label: "0:38-0:45 Loop CTA", pct: 15, color: "#a855f7", detail: "Point to Linked Long-Form + Loop" }
          ]
        : [
            { label: "0:00-0:35 Cold Hook", pct: 12, color: "#ff3b5c", detail: "Show End Result First + Open Loop" },
            { label: "0:35-2:30 Context/Myth", pct: 18, color: "#f59e0b", detail: "Why Common Advice Fails + Visual Chart" },
            { label: "2:30-7:45 Core System", pct: 45, color: "#4f6ef7", detail: "3 Chapters with Pattern Interrupt every 45s" },
            { label: "7:45-9:45 Live Proof", pct: 15, color: "#10b981", detail: "Real-World Demo & Edge-Case Fix" },
            { label: "9:45-10:30 Next Step", pct: 10, color: "#a855f7", detail: "Abrupt Value Bridge to Next Video" }
          ],
      uploadSequenceNote: isShortOnly
        ? "Publish 4 hours BEFORE or 18 hours AFTER the Pillar Long-Form video with the 'Related Video' tag pointing directly to the Long-Form upload."
        : "Publish as Pillar Anchor on Tuesday/Thursday/Saturday peak audience window; follow up 18 hours later with a 45s Highlight Short."
    };
  }

  /**
   * Determines narrative archetype index (0: Step-by-Step System Build, 1: Myth-Busting Experiment, 2: Investigative Case Study)
   * so offline scripts dynamically vary across topics and script styles.
   */
  function selectNarrativeVariant(blueprint) {
    const style = String(blueprint.scriptStyle || "").toLowerCase();
    const title = String(blueprint.topicTitle || "").toLowerCase();
    if (style.includes("myth") || style.includes("before/after") || title.includes("tested") || title.includes("mistake") || title.includes("90%")) {
      return 1; // Myth-Busting Experiment
    }
    if (style.includes("mystery") || style.includes("contrarian") || title.includes("hidden") || title.includes("roadmap") || title.includes("secret")) {
      return 2; // Investigative Case Study
    }
    return 0; // Step-by-Step System Build
  }

  /**
   * LOOP-04: Transforms script dialogue based on selected code-switching ratio (`codeSwitchMix`)
   * so changing `#bpCodeSwitchSelect` produces noticeably different, authentic spoken dialogue
   * in the script body (not just a bracket header change).
   */
  function applyCodeSwitchTransform(scriptBody, codeSwitchMix, languageName, cleanSubject, bp) {
    const mix = String(codeSwitchMix || CODE_SWITCH_OPTIONS[0]);
    const lang = String(languageName || (bp && bp.language) || "English (Global)");
    const isHinglish = lang.includes("Hinglish");
    const isTanglish = lang.includes("Tanglish");
    const isHindi = lang.includes("Hindi (हिन्दी)");
    const isSpanish = lang.includes("Spanish");
    let transformed = String(scriptBody || "");

    // 1. Storytelling Native-Heavy (75% Native / 25% English)
    if (mix.includes("75% Native")) {
      if (isHinglish || isHindi) {
        transformed = transformed
          .replace(/Dekhiye, 90% creators/g, "Zara sochiye, jab aap roz ghanto mehnat karte hain, tab bhi 90% creators")
          .replace(/Bas yeh 3-step shortcut use karo:/g, "Aaiye iska asli sach dekhte hain—bas yeh 3 aasaan kadam apnayein:")
          .replace(/Sabse bada myth yeh hai ki/g, "Sabse badi baat yeh hai ki")
          .replace(/Investigation mein ek clear pattern samne aaya:/g, "Zara sochiye, jab humne gehraai se jaanch ki toh iska asli sach samne aaya:")
          .replace(/Dekhiye, jab hum/g, "Sabse badi baat yeh hai ki jab hum")
          .replace(/Ab chaliye direct practical setup dekhte hain:/g, "Aaiye iska asli sach dekhte hain aur seedha practical tarika samajhte hain:");

        transformed += `\n\n[SPOKEN CADENCE — 75% NATIVE STORYTELLING]\n"Sabse badi baat yeh hai ki ${cleanSubject} mein sachi kaamyabi tabhi milti hai jab aap bheed se alag sochte hain. Zara sochiye, jab aap roz ghanto mehnat karte hain aur phir bhi sahi parinaam nahi milta, toh galti aapki mehnat mein nahi, purane tarike mein hoti hai. Aaiye iska asli sach dekhte hain aur is poore system ko apni bhasha aur apne andaaz mein master karte hain!"`;
      } else if (isTanglish) {
        transformed = transformed
          .replace(/Paarunga, 90% people/g, "Romba mukkiyamaana vishayam enna na, neenga daily hours kanakka work pannalum 90% per")
          .replace(/Indha 3-step shortcut-ah ipove try pannunga:/g, "Romba mukkiyamaana vishayam enna na, indha 3 eliya vazhigalai ipove paarunga:")
          .replace(/Mukkiyama 2 reasons nala dhaan normal workflow fail aagudhu:/g, "Neenga daily hours kanakka work pannalum, indha 2 mukkiyamaana kaaranangal nala dhaan palan kidaikama pogudhu:")
          .replace(/Ipove indha 3-step blueprint-ah implement pannunga:/g, "Vaanga, ippo namma unmaiyaana 3-step muraiyai step-by-step ah paarkalaam:");

        transformed += `\n\n[SPOKEN CADENCE — 75% NATIVE STORYTELLING]\n"Romba mukkiyamaana vishayam enna na, neenga daily hours kanakka work pannalum ${cleanSubject}-la sariyaana muraiyum unarvum illana audience manasula idam pidika mudiyaadhu. Vaanga, namma ooru style-la idhoda unmaiyaana ragasiyathai ippo muzhumaiyaaga paarkalaam!"`;
      } else if (isSpanish) {
        transformed += `\n\n[SPOKEN CADENCE — 75% NATIVE STORYTELLING]\n"Lo más importante aquí es entender la historia real detrás de ${cleanSubject}: imagina trabajar horas cada día sin ver resultados reales simplemente por seguir consejos genéricos. Vamos a descubrir la verdad paso a paso."`;
      } else {
        transformed += `\n\n[SPOKEN CADENCE — 75% NATIVE STORYTELLING]\n"The biggest truth nobody tells you is this: imagine pouring hours into ${cleanSubject} every single week while feeling stuck on a treadmill. Let's look at the real story behind why that happens—and how one human shift changes everything."`;
      }
      return transformed;
    }

    // 2. Technical English-Heavy (25% Native / 75% English)
    if (mix.includes("75% English")) {
      if (isHinglish || isHindi) {
        transformed = transformed
          .replace(
            /Dekhiye, 90% creators [^\n]+/g,
            `Dekhiye, the core bottleneck in ${cleanSubject} is execution latency—let's benchmark the exact 3-step fix on screen:`
          )
          .replace(
            /Sabse pehle samajhte hain ki purana method fail kyun hota hai:/g,
            `Dekhiye, the core bottleneck in ${cleanSubject} is execution latency—let's benchmark the exact 3-step fix on screen:`
          )
          .replace(
            /Sabse bada myth yeh hai ki aapko expensive tools chahiye:/g,
            `Dekhiye, the core bottleneck in ${cleanSubject} is execution latency—let's benchmark the exact 3-step fix on screen:`
          )
          .replace(
            /Investigation mein ek clear pattern samne aaya:/g,
            `Dekhiye, the core bottleneck in ${cleanSubject} is execution latency—let's benchmark the exact 3-step fix on screen:`
          );

        transformed += `\n\n[SPOKEN CADENCE — 75% TECHNICAL ENGLISH]\n"Dekhiye, the core bottleneck in ${cleanSubject} is execution latency—let's benchmark the exact 3-step fix on screen: first, optimize your local pipeline configuration; second, enforce a strict 45-second retention reset across the timeline; and third, automate the Short-to-Long funnel conversion architecture."`;
      } else if (isTanglish) {
        transformed = transformed
          .replace(
            /Paarunga, 90% people [^\n]+/g,
            `Paarunga, the primary bottleneck in ${cleanSubject} is workflow friction—here is the exact 3-step technical architecture:`
          )
          .replace(
            /Mukkiyama 2 reasons nala dhaan normal workflow fail aagudhu:/g,
            `Paarunga, the primary bottleneck in ${cleanSubject} is workflow friction—here is the exact 3-step technical architecture:`
          );

        transformed += `\n\n[SPOKEN CADENCE — 75% TECHNICAL ENGLISH]\n"Paarunga, the primary bottleneck in ${cleanSubject} is workflow friction—here is the exact 3-step technical architecture: lock in deterministic presets, maintain high-retention visual velocity every 45 seconds, and deploy a synchronized multi-format distribution funnel."`;
      } else {
        transformed += `\n\n[SPOKEN CADENCE — 75% TECHNICAL ENGLISH]\n"From a systems engineering perspective, the primary bottleneck in ${cleanSubject} is execution latency—let's benchmark the exact 3-step technical architecture on screen with zero fluff."`;
      }
      return transformed;
    }

    // 3. 100% Pure Selected Language
    if (mix.includes("100% Pure")) {
      if (isHinglish || isHindi) {
        transformed = transformed
          .replace(/you're losing 80% output—let me show you why!/g, "aap apna 80 pratishat parinaam kho rahe hain—aaiye dekhte hain kyun!")
          .replace(/aur jo result aaya wo sach mein insane hai\./g, "aur jo parinaam samne aaya wo sach mein adbhut hai.")
          .replace(/chaliye isko step-by-step fix karte hain\./g, "chaliye isey kram-anusar poori tarah sudharte hain.")
          .replace(/Bas yeh 3-step shortcut use karo:/g, "Keval yeh teen saral upay apnayein:")
          .replace(/Ab chaliye direct practical setup dekhte hain:/g, "Ab chaliye seedha vyavaharik tarika kram-anusar dekhte hain:");

        transformed += `\n\n[SPOKEN CADENCE — 100% PURE SELECTED LANGUAGE]\n"बिना किसी अंग्रेज़ी मिलावट के सीधा और स्पष्ट नियम यह है: जब आप ${cleanSubject} को सही क्रम, सही गति और स्पष्ट प्रमाण के साथ प्रस्तुत करते हैं, तो दर्शक शुरू से अंत तक जुड़े रहते हैं। आइए इन तीनों चरणों को पूरी एकाग्रता के साथ लागू करें।"`;
      } else if (isTanglish) {
        transformed = transformed
          .replace(/80% output miss panringa—epdi fix panradhu nu paakalam!/g, "80 sadhaveedham palanai izhakireergal—idhai eppadi sari seivadhu endru paarkalaam!")
          .replace(/Indha 3-step shortcut-ah ipove try pannunga:/g, "Indha moondru eliya vazhigalai ippodhe payanpaduthungal:");

        transformed += `\n\n[SPOKEN CADENCE — 100% PURE SELECTED LANGUAGE]\n"முழுமையான தமிழ் நடையில் சொல்ல வேண்டுமென்றால்: ${cleanSubject} துறையில் நிலையான வெற்றியைப் பெற தெளிவான திட்டமிடலும், தொடர்ச்சியான பயிற்சியும், சரியான வரிசையில் காணொளிகளை வெளியிடுவதும் மட்டுமே மிகச்சிறந்த வழியாகும்."`;
      } else if (isSpanish) {
        transformed += `\n\n[SPOKEN CADENCE — 100% PURE SELECTED LANGUAGE]\n"En español 100% puro sin anglicismos: cuando estructuras ${cleanSubject} con pruebas claras desde el primer segundo y un ritmo constante, duplicas la retención de tu audiencia."`;
      } else {
        transformed += `\n\n[SPOKEN CADENCE — 100% PURE SELECTED LANGUAGE]\n"Delivered in 100% pure, crystal-clear English: every single sentence in this ${cleanSubject} workflow removes jargon and focuses strictly on measurable viewer outcomes."`;
      }
      return transformed;
    }

    // 4. Balanced Creator Mix (50% Native / 50% English Tech Terms) — default balanced output
    return transformed;
  }

  /**
   * Generates either a tight 45-second (~115-125 words) Short-form script (SOL-17)
   * or a full Long-form chaptered script, using natural speakable hooks (SOL-14),
   * regional code-switching mix (MOAT-01 / LOOP-04), and multi-template narrative variety.
   */
  function generateScript(blueprint) {
    const bp = blueprint || {};
    const langProfile = LANGUAGE_PROFILES[bp.language] || LANGUAGE_PROFILES["English (Global)"];
    const cleanSubject = extractSpeakableSubject(bp.topicTitle, bp.niche);
    const codeSwitchMix = bp.codeSwitchMix || CODE_SWITCH_OPTIONS[0];
    const thumbBadgeText = bp.thumbBadgeText || deriveDefaultThumbBadge(bp.topicTitle);
    const hooks = langProfile.hookTemplates.map(t => t.replace("{topic}", cleanSubject));

    const fmtRaw = (bp.format || "").toLowerCase();
    const isShortOnly = fmtRaw.includes("short") && !fmtRaw.includes("both");
    const isHinglish = (bp.language || "").includes("Hinglish");
    const isTanglish = (bp.language || "").includes("Tanglish");
    const isHindi = (bp.language || "").includes("Hindi (हिन्दी)");
    const variant = selectNarrativeVariant(bp);
    const archetypeNames = [
      "Step-by-Step System Build",
      "Myth-Busting 30-Day Experiment",
      "Investigative Case Study & Autopsy"
    ];
    const activeArchetype = archetypeNames[variant];

    let scriptBody = "";

    // SOL-17: Dedicated 45-Second Vertical Shorts Script (~115-125 spoken words)
    if (isShortOnly) {
      if (isHinglish) {
        scriptBody = `[0:00 - 0:03 | VIRAL SHORTS HOOK • ${activeArchetype.toUpperCase()}]
[VISUAL: Vertical 9:16 split-screen showing final result on top + bold yellow caption "${thumbBadgeText}"]
[AUDIO: Fast whoosh + high-energy voiceover | Code-Switch: ${codeSwitchMix}]
"${hooks[variant % hooks.length]}"

[0:03 - 0:18 | THE MISTAKE (2s Visual Cuts)]
[VISUAL: Red X overlay on old slow method]
Dekhiye, 90% creators ${cleanSubject} mein ghanto waste karte hain kyunki wo outdated manual steps follow karte hain.

[0:18 - 0:38 | 3-STEP RAPID FIX]
[VISUAL: Screen zoom punch-ins on Steps 1, 2, 3]
Bas yeh 3-step shortcut use karo:
1. Default settings band karke custom local preset lagao.
2. Har 3 seconds mein visual cut aur retention beat sync rakho.
3. Output ko seedha workflow mein automate kar do—kaam 10x fast ho jayega!

[0:38 - 0:45 | SEAMLESS LOOP & FUNNEL CTA]
[VISUAL: Finger pointing down to 'Related Video' link on Shorts player]
Iska poora step-by-step setup niche 'Related Video' link mein live hai—abhi click karo, kyunki...`;
      } else if (isTanglish) {
        scriptBody = `[0:00 - 0:03 | VIRAL SHORTS HOOK • ${activeArchetype.toUpperCase()}]
[VISUAL: Vertical 9:16 split-screen showing live proof + bold badge "${thumbBadgeText}"]
[AUDIO: Crisp bass riser + energetic Chennai/Coimbatore creator delivery | Mix: ${codeSwitchMix}]
"${hooks[variant % hooks.length]}"

[0:03 - 0:18 | THE BOTTLENECK (Cut every 2s)]
[VISUAL: Red X overlay on slow manual workflow]
Paarunga, 90% people ${cleanSubject} setup pannumbodhu old manual method use panni hours waste panranga.

[0:18 - 0:38 | 3-STEP RAPID FIX]
[VISUAL: Fast 4K screen punch-ins on Steps 1, 2, 3]
Indha 3-step shortcut-ah ipove try pannunga:
1. Default config-ah off pannitu repeatable template lock pannunga.
2. Every 3 seconds oru visual pattern interrupt and beat cut kudunga.
3. Ungaloda Short-ah direct-ah main Long-form video kooda link pannunga—output double aagum!

[0:38 - 0:45 | SEAMLESS LOOP & FUNNEL CTA]
[VISUAL: Point directly to 'Related Video' link at the bottom of Shorts player]
Idhoda full step-by-step breakdown keela iruka 'Related Video' link-la iruku—ipove tap pannunga, ஏன்னா...`;
      } else if (isHindi) {
        scriptBody = `[0:00 - 0:03 | शॉर्ट्स हुक (VIRAL HOOK • ${activeArchetype.toUpperCase()})]
[दृश्य: 9:16 स्क्रीन पर सीधे परिणाम दिखाएं + थंबनेल बैज "${thumbBadgeText}"]
"${hooks[variant % hooks.length]}"

[0:03 - 0:18 | सबसे बड़ी गलती]
[दृश्य: तेज़ कट्स और लाल क्रॉस ग्राफ़िक]
90% लोग ${cleanSubject} में घंटों बर्बाद करते हैं क्योंकि वे पुराने तरीके अपनाते हैं।

[0:18 - 0:38 | 3-स्टेप तेज़ समाधान]
[दृश्य: स्क्रीन पर 1-2-3 पॉइंटर्स ज़ूम]
बस यह 3 बदलाव करें:
1. सही प्रीसेट के साथ शुरुआत करें।
2. हर 3 सेकंड में विज़ुअल बदलाव रखें।
3. पूरे सिस्टम को एक बार सेट करके ऑटोमेट कर लें।

[0:38 - 0:45 | लूप और अगला वीडियो (CTA)]
[दृश्य: नीचे दिख रहे 'Related Video' लिंक की ओर इशारा करें]
पूरा डिटेल वीडियो नीचे लिंक में है—अभी क्लिक करें!`;
      } else {
        scriptBody = `[0:00 - 0:03 | VIRAL SHORTS HOOK • ${activeArchetype.toUpperCase()}]
[VISUAL: Vertical 9:16 — Show final result in frame 1 + Kinetic caption "${thumbBadgeText}"]
[AUDIO: Crisp sub-hit + 165 WPM punchy delivery | Code-Switch: ${codeSwitchMix}]
"${hooks[variant % hooks.length]}"

[0:03 - 0:18 | THE BOTTLENECK (Cut every 2s)]
[VISUAL: Side-by-side comparison — Slow Way (Red) vs 45s Fix (Green)]
When most people set up ${cleanSubject}, they waste hours doing every step manually from scratch.

[0:18 - 0:38 | THE 3-STEP RAPID FIX]
[VISUAL: Fast screen punch-ins on 1, 2, 3]
Do this 3-step swap instead:
1. Lock in a repeatable template before you start.
2. Cut every dead pause so every 3 seconds delivers new visual proof.
3. Chain this Short directly to your main deep-dive workflow.

[0:38 - 0:45 | SEAMLESS LOOP & RELATED VIDEO CTA]
[VISUAL: Point directly at the 'Related Video' link at the bottom of the screen]
I put the full step-by-step breakdown in the Related Video right below—tap it now, because...`;
      }
    } else {
      // Full Long-Form Script (10-14 mins structure) with multi-template narrative rotation
      if (isHinglish) {
        if (variant === 1) {
          scriptBody = `[0:00 - 0:15 | COLD OPEN HOOK • MYTH-BUSTING EXPERIMENT]
[VISUAL: Side-by-side 30-Day Experiment Tracker + Thumbnail Badge Overlay "${thumbBadgeText}"]
[AUDIO: Sub-bass hit + 155 WPM | Code-Switch: ${codeSwitchMix}]
"${hooks[1]}"
Pichle 30 days mein maine ${cleanSubject} ke top viral methods ko real data ke saath test kiya—aur 5 mein se 4 methods bilkul fail ho gaye.

[0:15 - 1:30 | THE MYTH VS REALITY AUTOPSY]
[VISUAL: Red vs Green benchmark spreadsheet on screen]
[EDITING NOTE: J-Cut audio 0.5s before switching to live data chart]
Sabse bada myth yeh hai ki aapko expensive tools chahiye:
1. Myth #1: Paid subscriptions = better output (Reality: Local setup 2x faster hai).
2. Myth #2: Daily random uploads kaam karte hain (Reality: Funnel sequencing wins).

[1:30 - 5:30 | THE WINNING EXPERIMENTAL PROTOCOL]
[VISUAL: Live 4K Screen Share / Benchmark Walkthrough]
Jo 1 method humare test mein top 1% mein aaya, uske 3 pillars hain:
- STEP 1 (Calibration): Apne setup ko "${bp.tone}" ke hisaab se structure karein.
- STEP 2 (Retention Cadence): "${bp.pacing}" follow karein taaki mid-video drop zero ho jaye.
- STEP 3 (Code-Switch Clarity): Delivery ko "${codeSwitchMix}" pe rakhein for maximum Indian + Global watch time.

[5:30 - 7:30 | REAL NUMBERS & EDGE-CASE FIX]
[VISUAL: Before vs After retention curve comparison]
Jab humne yeh exact tweak apply kiya, toh average view duration 38% se seedha 64% pe jump ho gaya.

[7:30 - END | ABRUPT BRIDGE CTA]
[VISUAL: Point directly to on-screen End Screen card — do NOT say "thanks for watching"]
${langProfile.ctaStyle}`;
        } else if (variant === 2) {
          scriptBody = `[0:00 - 0:15 | COLD OPEN HOOK • INVESTIGATIVE CASE STUDY]
[VISUAL: Dark-mode timeline canvas zoom + High-contrast callout "${thumbBadgeText}"]
[AUDIO: Cinematic pulse riser + 150 WPM | Code-Switch: ${codeSwitchMix}]
"${hooks[2]}"
Aakhir top 1% creators ${cleanSubject} ko itna effortlessly kaise scale kar lete hain jabki baaki sab stuck rehte hain? Aaj hum iska pura blueprint decode karenge.

[0:15 - 1:30 | THE HIDDEN BOTTLENECK]
[VISUAL: Excalidraw architecture breakdown showing the exact failure point]
Investigation mein ek clear pattern samne aaya:
1. Creators isolated videos banate hain bina kisi Short-to-Long bridge ke.
2. First 30 seconds mein proof dikhane ke bajay lamba intro dete hain.

[1:30 - 5:30 | DECONSTRUCTING THE 3-PART ARCHITECTURE]
[VISUAL: ${bp.videoStyle}]
Chaliye is investigative system ke teeno layers ko open karte hain:
- LAYER 1 (Hook Engineering): "${thumbBadgeText}" badge aur opening frame mein zero repetition rakhein.
- LAYER 2 (Visual Pacing): "${bp.pacing}" ke saath har 45 seconds mein ek naya visual proof dikhayein.
- LAYER 3 (Algorithmic Flywheel): Har Long-form pillar ko 2 targeted Shorts se connect karein.

[5:30 - 7:30 | THE UNFAIR ADVANTAGE]
[VISUAL: Live workflow execution proof]
Yehi wo chota sa system shift hai jo ordinary channels ko niche leader bana deta hai.

[7:30 - END | ABRUPT BRIDGE CTA]
[VISUAL: End Screen pops up while speaking mid-sentence]
${langProfile.ctaStyle}`;
        } else {
          scriptBody = `[0:00 - 0:15 | COLD OPEN HOOK • STEP-BY-STEP SYSTEM BUILD]
[VISUAL: Fast zoom-in on final result screen + High-contrast text overlay "${thumbBadgeText}"]
[AUDIO: Subtle sub-bass hit + crisp voiceover at 155 WPM | Code-Switch: ${codeSwitchMix}]
"${hooks[0]}"
Dekhiye, jab hum ${cleanSubject} ki baat karte hain, toh 90% creators sirf surface-level tips follow karte hain. Lekin aaj ke is video mein, main aapko live screen pe step-by-step exact system dikhane wala hoon jo actually work karta hai.

[0:15 - 1:30 | THE CORE PROBLEM & PATTERN INTERRUPT]
[VISUAL: Excalidraw diagram comparing Old Workflow (Red) vs New Blueprint (Green)]
[EDITING NOTE: J-Cut audio 0.5s before switching to screen recording]
Sabse pehle samajhte hain ki purana method fail kyun hota hai:
1. Too much manual friction — har step pe time waste hota hai.
2. Zero retention structure — audience 30 seconds mein drop ho jati hai.

[1:30 - 5:30 | STEP-BY-STEP BLUEPRINT EXECUTION]
[VISUAL: Live 4K Screen Share / Demonstration with dynamic cursor zoom]
Ab chaliye direct practical setup dekhte hain:
- STEP 1 (Foundation): Sabse pehle apne workspace mein core parameters set karein (${bp.tone}).
- STEP 2 (Execution): Pacing ko "${bp.pacing}" pe lock karein taaki har 45 seconds mein ek visual pattern interrupt aaye.
- STEP 3 (Optimization): Apne Short-form aur Long-form videos ko ek single funnel sequence mein connect karein.

[5:30 - 7:30 | PRO SECRET & REAL-WORLD PROOF]
[VISUAL: Side-by-side Before vs After metrics card]
Yahan ek pro-tip dhyan rakhiye: sirf content banana kaafi nahi hai, upload sequence decide karta hai ki algorithm aapke video ko kitna push dega.

[7:30 - END | ABRUPT BRIDGE CTA]
[VISUAL: Point directly to on-screen End Screen card — do NOT say "thanks for watching"]
${langProfile.ctaStyle}`;
        }
      } else if (isTanglish) {
        scriptBody = `[0:00 - 0:15 | COLD OPEN HOOK • ${activeArchetype.toUpperCase()}]
[VISUAL: Fast zoom-in on live output screen + Thumbnail Badge Callout "${thumbBadgeText}"]
[AUDIO: Clean bass hit + 155 WPM Tanglish Creator Delivery | Mix: ${codeSwitchMix}]
"${hooks[variant % hooks.length]}"
Inniku indha video-la, ${cleanSubject}-ah zero cost-la step-by-step epdi master panradhu nu live proof oda paaka porom.

[0:15 - 1:30 | THE CORE PROBLEM & PATTERN INTERRUPT]
[VISUAL: Excalidraw diagram — Old Manual Method (Red) vs Smart System (Green)]
[EDITING NOTE: ${bp.pacing}]
Mukkiyama 2 reasons nala dhaan normal workflow fail aagudhu:
1. Over-complicated manual setup — ovvoru step-kum hours waste aagum.
2. First 30 seconds-la visual proof illama audience swipe panniruvanga.

[1:30 - 5:30 | STEP-BY-STEP SYSTEM EXECUTION]
[VISUAL: ${bp.videoStyle}]
Ipove indha 3-step blueprint-ah implement pannunga:
- STEP 1 (Core Setup): Ungaloda tone-ah "${bp.tone}" style-la lock pannunga.
- STEP 2 (Retention Pacing): "${bp.pacing}" follow panni every 45 seconds oru pattern interrupt kudunga.
- STEP 3 (Funnel Linking): Short-form video-la irundhu 'Related Video' link valiya Long-form pillar-ku direct traffic kondu vaanga.

[5:30 - 7:30 | LIVE BENCHMARK & PRO SECRET]
[VISUAL: Side-by-side Before vs After analytics comparison]
Indha exact "${codeSwitchMix}" delivery use pannumbodhu retention matrum CTR rendume massiv-ah boost aagum.

[7:30 - END | ABRUPT VALUE BRIDGE CTA]
[VISUAL: Point directly to End Screen card on screen — zero slow outro]
${langProfile.ctaStyle}`;
      } else if (isHindi) {
        scriptBody = `[0:00 - 0:15 | धमाकेदार शुरुआत (HOOK • ${activeArchetype.toUpperCase()})]
[दृश्य: सीधे अंतिम परिणाम (Final Result) को स्क्रीन पर दिखाएं + बैज "${thumbBadgeText}"]
"${hooks[variant % hooks.length]}"
आज के इस वीडियो में हम ${cleanSubject} का पूरा प्रैक्टिकल सिस्टम स्टेप-बाय-स्टेप समझेंगे।

[0:15 - 1:45 | असली समस्या क्या है?]
[दृश्य: चार्ट और तुलनात्मक ग्राफ़ के साथ तेज़ कट्स]
ज़्यादातर लोग बिना किसी स्पष्ट ब्लूप्रिंट के शुरुआत कर देते हैं। सही टोन (${bp.tone}) और सही पेसिंग (${bp.pacing}) के बिना दर्शक पहले ही मिनट में वीडियो छोड़ देते हैं।

[1:45 - 6:00 | 3-स्टेप मास्टर ब्लूप्रिंट]
[दृश्य: लाइव डेमो और स्क्रीन रिकॉर्डिंग ज़ूम-इन]
- पहला कदम: अपने विषय को सर्च और वायरल स्कोर के आधार पर चुनें।
- दूसरा कदम: हर 45 सेकंड में विज़ुअल बदलाव (Pattern Interrupt) रखें।
- तीसरा कदम: शॉर्ट्स और लॉन्ग वीडियो को एक साथ सीक्वेंस में पब्लिश करें।

[6:00 - अंत | अगला कदम (CTA)]
[दृश्य: स्क्रीन पर दिख रहे अगले वीडियो की ओर इशारा करें]
${langProfile.ctaStyle}`;
      } else {
        if (variant === 1) {
          scriptBody = `[0:00 - 0:15 | COLD OPEN HOOK • MYTH-BUSTING EXPERIMENT]
[VISUAL: 30-Day Experiment Split-Screen + High-Contrast Badge "${thumbBadgeText}"]
[AUDIO: Crisp riser into ${bp.wpmTarget} delivery | Code-Switch: ${codeSwitchMix}]
"${hooks[1]}"
Over the last 30 days, I ran a controlled benchmark across the top ${cleanSubject} strategies—and 80% of the popular advice failed under real-world pressure.

[0:15 - 1:30 | THE DATA AUTOPSY (WHY THE OLD PLAYBOOK FAILS)]
[VISUAL: Side-by-side benchmark table comparing 5 tested methods]
[EDITING NOTE: ${bp.pacing}]
Here is what the raw numbers revealed about ${cleanSubject}:
1. Complexity kills velocity — bloated workflows cause a 42% drop-off before minute two.
2. Disconnected uploads starve the recommendation engine of session watch time.

[1:30 - 6:00 | THE 3-STEP WINNING PROTOCOL]
[VISUAL: ${bp.videoStyle}]
Here is the exact 3-part protocol that outperformed every other test:
- PHASE 1 (Zero-Friction Setup): Anchor your presentation in "${bp.tone}" with immediate visual proof.
- PHASE 2 (Retention Architecture): Execute "${bp.scriptStyle}" with a visual reset every 45 seconds.
- PHASE 3 (The Shorts-to-Long Bridge): Route high-velocity mobile traffic directly into this pillar upload.

[6:00 - 8:30 | REAL-WORLD BENCHMARK & CAVEAT]
[VISUAL: Live metric comparison — Baseline vs Experiment Winner]
Avoid the common trap of changing your thumbnail badge ("${thumbBadgeText}") to repeat words already in your title.

[8:30 - END | SEAMLESS VALUE BRIDGE CTA]
[VISUAL: End-screen card triggers while still mid-explanation]
${langProfile.ctaStyle}`;
        } else if (variant === 2) {
          scriptBody = `[0:00 - 0:15 | COLD OPEN HOOK • INVESTIGATIVE CASE STUDY]
[VISUAL: Dark-mode forensic timeline zoom + Badge Callout "${thumbBadgeText}"]
[AUDIO: Suspenseful pulse + ${bp.wpmTarget} delivery | Code-Switch: ${codeSwitchMix}]
"${hooks[2]}"
Why do a tiny fraction of creators make ${cleanSubject} look effortless while everyone else hits a wall? Let's open the case file and look at the exact mechanics.

[0:15 - 1:30 | THE ANATOMY OF THE BOTTLENECK]
[VISUAL: Interactive Excalidraw system diagram highlighting the hidden bottleneck]
[EDITING NOTE: ${bp.pacing}]
When you inspect the timeline of stalling channels, two critical flaws appear:
1. They front-load backstory instead of proving the outcome in the first 15 seconds.
2. They ignore the title-to-thumbnail packaging gap.

[1:30 - 6:00 | THE 3-LAYER SYSTEM DECONSTRUCTION]
[VISUAL: ${bp.videoStyle}]
Let's reconstruct the winning architecture piece by piece:
- LAYER 1 (Packaging Contrast): Pair a high-curiosity title with the "${thumbBadgeText}" badge so the viewer's eye locks on immediately.
- LAYER 2 (Pacing Engine): Lock into "${bp.pacing}" to maintain high average percentage viewed.
- LAYER 3 (Distribution Flywheel): Sequence supporting Shorts 20 hours before and 28 hours after the main upload.

[6:00 - 8:30 | THE COMPOUNDING EFFECT]
[VISUAL: Live walkthrough of the completed workflow in action]
Once all three layers run together, every upload reinforces the next one automatically.

[8:30 - END | SEAMLESS VALUE BRIDGE CTA]
[VISUAL: Point directly to the next case study on screen]
${langProfile.ctaStyle}`;
        } else {
          scriptBody = `[0:00 - 0:15 | COLD OPEN HOOK • STEP-BY-STEP SYSTEM BUILD]
[VISUAL: Show final proof/result on screen within 2.5 seconds + Kinetic badge "${thumbBadgeText}"]
[AUDIO: Crisp riser into clean vocal delivery — Target Pace: ${bp.wpmTarget} | Mix: ${codeSwitchMix}]
"${hooks[0]}"
In the next few minutes, I'm going to hand you the exact, repeatable system for ${cleanSubject}—and at the end, I'll show you the one sequencing tweak that doubles retention.

[0:15 - 1:30 | THE BOTTLENECK (WHY STANDARD ADVICE FAILS)]
[VISUAL: Clean comparison diagram — Standard Approach vs High-Leverage Blueprint]
[EDITING NOTE: ${bp.pacing}]
Here is why most attempts at ${cleanSubject} stall out:
1. They treat every upload like an isolated island instead of a connected funnel.
2. They bury the payoff at minute 8 instead of proving value in the first 30 seconds.

[1:30 - 6:00 | THE 3-PART EXECUTION BLUEPRINT]
[VISUAL: ${bp.videoStyle}]
Let's break down the system step by step:
- PART 1 (The Setup): Anchor your tone around "${bp.tone}" so the viewer immediately trusts your authority.
- PART 2 (The Pacing Engine): Follow the "${bp.scriptStyle}" structure, placing a visual reset every 45 seconds.
- PART 3 (The Funnel Multiplier): Pair your Long-form deep dive with two high-velocity Shorts that point back via the Related Video link.

[6:00 - 8:30 | LIVE BENCHMARK & PRO CAVEAT]
[VISUAL: Zoom in on real metrics / workflow walk-through]
Notice what happens when you apply this exact sequence: you stop relying on luck and start building predictable browse + search momentum.

[8:30 - END | SEAMLESS VALUE BRIDGE CTA]
[VISUAL: End-screen card appears early while still speaking — avoid saying "wrapping up"]
${langProfile.ctaStyle}`;
        }
      }
    }

    scriptBody = applyCodeSwitchTransform(scriptBody, codeSwitchMix, bp.language, cleanSubject, bp);

    return {
      hooks,
      scriptBody,
      narrativeArchetype: activeArchetype,
      codeSwitchMix,
      thumbBadgeText,
      productionChecklist: [
        `Format locked: ${bp.format}`,
        `Code-Switch Mix: ${codeSwitchMix}`,
        `Thumbnail Badge: "${thumbBadgeText}"`,
        `Tone calibration: ${bp.tone}`,
        `Pacing cadence: ${bp.pacing}`,
        `Visual style: ${bp.videoStyle}`,
        `Language & Titles: ${bp.thumbnailAndTitleNotes}`
      ]
    };
  }

  /**
   * MOAT-01B: India vs. Global RPM & Sponsorship Rate Card Estimator
   */
  function calculateMonetizationEstimate(nicheName, region, expectedViews = 50000) {
    const profile = getNicheProfile(nicheName);
    const views = Math.max(Number(expectedViews) || 50000, 1000);
    const rpmMatches = String(profile.avgRpm || "$7.00 - $15.00").match(/(\d+(?:\.\d+)?)/g);
    const baseLowUsd = rpmMatches && rpmMatches[0] ? parseFloat(rpmMatches[0]) : 7.0;
    const baseHighUsd = rpmMatches && rpmMatches[1] ? parseFloat(rpmMatches[1]) : 15.0;

    const regStr = String(region || "India (IN)").toLowerCase();
    const isIndia = regStr.includes("india") || regStr === "in";
    const isLatam = regStr.includes("latam") || regStr.includes("spain") || regStr.includes("es");

    // Regional AdSense RPM multiplier (Indian tech/finance/creator RPM vs Tier-1 US/UK/CA)
    const regionMultiplier = isIndia ? 0.24 : isLatam ? 0.45 : 1.0;
    const usdToInr = 84.0;

    const effLowRpmUsd = Math.max(baseLowUsd * regionMultiplier, 0.85);
    const effHighRpmUsd = Math.max(baseHighUsd * regionMultiplier, 2.1);

    const adSenseLowUsd = Math.round((views / 1000) * effLowRpmUsd);
    const adSenseHighUsd = Math.round((views / 1000) * effHighRpmUsd);

    const adSenseLowInr = Math.round((adSenseLowUsd * usdToInr) / 100) * 100;
    const adSenseHighInr = Math.round((adSenseHighUsd * usdToInr) / 100) * 100;

    // Global Tier-1 Comparison
    const globalLowUsd = Math.round((views / 1000) * baseLowUsd);
    const globalHighUsd = Math.round((views / 1000) * baseHighUsd);

    // Brand Sponsorship CPV (60s Mid-Roll Integration vs Dedicated Video)
    const cpvLow = isIndia ? 0.012 : isLatam ? 0.018 : 0.028;
    const cpvHigh = isIndia ? 0.024 : isLatam ? 0.032 : 0.05;
    const nicheAuthorityBoost = baseHighUsd >= 20 ? 1.35 : baseHighUsd >= 15 ? 1.15 : 1.0;

    const midLowUsd = Math.round((views * cpvLow * nicheAuthorityBoost) / 10) * 10;
    const midHighUsd = Math.round((views * cpvHigh * nicheAuthorityBoost) / 10) * 10;
    const dedLowUsd = Math.round(midLowUsd * 2.2);
    const dedHighUsd = Math.round(midHighUsd * 2.5);

    return {
      niche: nicheName || "Tech & AI Tools",
      region: region || "India (IN)",
      expectedViews: views,
      baseRpmRange: profile.avgRpm,
      effectiveRpmUsd: `$${effLowRpmUsd.toFixed(2)} – $${effHighRpmUsd.toFixed(2)}`,
      estimatedAdSenseUsd: `$${adSenseLowUsd.toLocaleString("en-US")} – $${adSenseHighUsd.toLocaleString("en-US")}`,
      estimatedAdSenseInr: `₹${adSenseLowInr.toLocaleString("en-IN")} – ₹${adSenseHighInr.toLocaleString("en-IN")}`,
      globalComparisonUsd: `$${globalLowUsd.toLocaleString("en-US")} – $${globalHighUsd.toLocaleString("en-US")} (US/Global Tier-1)`,
      sponsorshipMidRollUsd: `$${midLowUsd.toLocaleString("en-US")} – $${midHighUsd.toLocaleString("en-US")}`,
      sponsorshipDedicatedUsd: `$${dedLowUsd.toLocaleString("en-US")} – $${dedHighUsd.toLocaleString("en-US")}`,
      outlierTargetMultiplier: "3.0x Channel Median"
    };
  }

  /**
   * MOAT-02 Helper: Title Packaging & Truncation Scorer
   */
  function evaluateTitlePackaging(title, thumbBadgeText) {
    const cleanTitle = String(title || "").trim();
    const cleanBadge = String(thumbBadgeText || "").trim();
    const charCount = cleanTitle.length;
    const desktopTruncated = charCount > 70;
    const mobileTruncated = charCount > 52;
    const shortsTruncated = charCount > 45;

    let ctrScore = 50;

    // 1. Optimal length window (42 - 62 chars)
    if (charCount >= 42 && charCount <= 62) {
      ctrScore += 20;
    } else if (charCount >= 32 && charCount <= 70) {
      ctrScore += 10;
    } else if (charCount > 70) {
      ctrScore -= 12;
    } else if (charCount < 20) {
      ctrScore -= 15;
    }

    // 2. Numbers, stats, or parenthetical/bracket context
    if (/\d+/.test(cleanTitle)) ctrScore += 10;
    if (/[\(\[\—\:]/.test(cleanTitle)) ctrScore += 8;

    // 3. High-curiosity / outcome power words
    const powerWords = /\b(without|tested|secret|mistake|mistakes|backwards|hidden|instantly|blueprint|roadmap|brutally|honest|complete|system|why|how|stop|never|truth|real)\b/i;
    if (powerWords.test(cleanTitle)) ctrScore += 12;

    // 4. Non-duplication check between Title and Thumbnail Badge Text
    const titleWords = new Set(
      cleanTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 3)
    );
    const badgeWords = cleanBadge
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 3);
    const duplicateWords = badgeWords.filter(w => titleWords.has(w));
    const hasDuplication = duplicateWords.length > 0;

    if (cleanBadge && !hasDuplication && cleanBadge.split(/\s+/).length <= 4) {
      ctrScore += 8;
    } else if (hasDuplication) {
      ctrScore -= 10;
    }

    ctrScore = Math.max(15, Math.min(99, Math.round(ctrScore)));

    let verdict = "";
    if (ctrScore >= 85 && !mobileTruncated) {
      verdict = "🔥 Elite Packaging (High Mobile CTR + Zero Truncation)";
    } else if (ctrScore >= 75) {
      verdict = mobileTruncated
        ? "✅ Strong Hook — Front-load key words before char 52 for mobile"
        : "✅ Strong High-Curiosity Packaging";
    } else if (hasDuplication) {
      verdict = "⚠️ Thumbnail Badge repeats title words — use complementary contrast text";
    } else if (desktopTruncated) {
      verdict = "⚠️ Too Long (>70 chars) — Cut filler words to prevent desktop & mobile cutoff";
    } else {
      verdict = "💡 Add a specific number, timeframe, or contrarian outcome to boost CTR";
    }

    const previewTitleMobile = charCount > 52 ? `${cleanTitle.slice(0, 50).trim()}...` : cleanTitle;

    return {
      charCount,
      desktopTruncated,
      mobileTruncated,
      shortsTruncated,
      ctrScore,
      verdict,
      previewTitleMobile
    };
  }

  function generateUploadSequence(nicheName, topics, startDateStr) {
    const baseDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() + 86400000);
    const cleanTopics = (topics && topics.length > 0)
      ? topics
      : generateTopicsForNiche(nicheName, "English (Global)", "US / Global", "All");

    const pillar1 = cleanTopics[0] || { title: `${nicheName} Core System` };
    const pillar2 = cleanTopics[2] || cleanTopics[1] || { title: `${nicheName} 30-Day Benchmark` };
    const pillar3 = cleanTopics[4] || cleanTopics[0] || { title: `${nicheName} Complete 2026 Roadmap` };

    const addDays = (d, days) => {
      const copy = new Date(d.getTime());
      copy.setDate(copy.getDate() + days);
      return copy.toISOString().split("T")[0];
    };

    return [
      {
        step: 1,
        date: addDays(baseDate, 0),
        dayTime: "Day 1 • 6:00 PM (Peak Browse)",
        format: "Short-form (9:16)",
        role: "Teaser Hook Short #1",
        title: `90% of People Do ${nicheName} Backwards — Do This in 45 Seconds Instead`,
        linkedTo: `Funnels into Step #2 (${pillar1.title})`,
        status: "Scripting",
        spacingNote: "Publishes 20h before Pillar Long-Form #1 to warm up niche audience."
      },
      {
        step: 2,
        date: addDays(baseDate, 1),
        dayTime: "Day 2 • 2:00 PM (Prime Long-Form)",
        format: "Long-form (16:9)",
        role: "Pillar Anchor #1",
        title: pillar1.title,
        linkedTo: "Main Funnel Destination for Short #1 & #3",
        status: "Scripting",
        spacingNote: "Core high-retention deep dive (10-14m). Link Short #1 'Related Video' here immediately."
      },
      {
        step: 3,
        date: addDays(baseDate, 2),
        dayTime: "Day 3 • 6:30 PM (28h After Pillar)",
        format: "Short-form (9:16)",
        role: "Highlight Clip Short #2",
        title: `The 1 Hidden Setting in ${nicheName} That Doubles Output Instantly`,
        linkedTo: `Points to Step #2 (${pillar1.title})`,
        status: "Idea",
        spacingNote: "Second wave traffic booster for Pillar #1 during its 48-hour algorithmic test window."
      },
      {
        step: 4,
        date: addDays(baseDate, 5),
        dayTime: "Day 6 • 2:00 PM (Prime Long-Form)",
        format: "Long-form (16:9)",
        role: "Authority Experiment #2",
        title: pillar2.title,
        linkedTo: "End-screen linked from Pillar #1",
        status: "Idea",
        spacingNote: "Captures returning viewers from Pillar #1 in the 7-day YouTube browse memory window."
      },
      {
        step: 5,
        date: addDays(baseDate, 6),
        dayTime: "Day 7 • 7:00 PM (Weekend Short)",
        format: "Short-form (9:16)",
        role: "Myth-Buster Short #3",
        title: `3 ${nicheName} Myths Tested Side-by-Side in 45 Seconds`,
        linkedTo: `Points to Step #4 (${pillar2.title})`,
        status: "Idea",
        spacingNote: "Drives weekend mobile Shorts viewers into Authority Experiment #2."
      },
      {
        step: 6,
        date: addDays(baseDate, 9),
        dayTime: "Day 10 • 2:00 PM (Evergreen Search)",
        format: "Long-form (16:9)",
        role: "Binge-Series Finale #3",
        title: pillar3.title,
        linkedTo: "Completes 3-Part Playlist Funnel",
        status: "Idea",
        spacingNote: "Locks in session watch-time by chaining Pillar #1 -> #2 -> #3 in an official Series Playlist."
      }
    ];
  }

  return {
    NICHES,
    LANGUAGE_PROFILES,
    CODE_SWITCH_OPTIONS,
    TONE_OPTIONS,
    PACING_OPTIONS,
    SCRIPT_STYLE_OPTIONS,
    VIDEO_STYLE_OPTIONS,
    extractSpeakableSubject,
    applyCodeSwitchTransform,
    getNicheProfile,
    generateTopicsForNiche,
    generateBlueprint,
    generateScript,
    calculateMonetizationEstimate,
    evaluateTitlePackaging,
    generateUploadSequence
  };
})();
