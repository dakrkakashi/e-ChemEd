/**
 * e-chemEd Embedded Data Fallback
 * Provides seamless offline execution even when opened directly via file:// protocol
 */
window.EchemData = {
  units: [
  {
    "id": 1,
    "unitNumber": 1,
    "title": "Water Processing and Environmental Sustainability",
    "shortTitle": "Water Processing",
    "icon": "droplet",
    "accentColor": "#0891b2",
    "status": "live",
    "description": "Hardness of water, EDTA complexometric titration, zeolite and ion-exchange softening, boiler feed water troubles, and environmental sustainability.",
    "topics": [
      "Water Hardness & Types (Temporary & Permanent)",
      "Units of Hardness (ppm, mg/L, °Cl, °Fr)",
      "EDTA Complexometric Titration Method",
      "Zeolite & Ion-Exchange Demineralization",
      "Boiler Troubles: Scale, Sludge & Caustic Embrittlement",
      "Environmental Sustainability & Water Recycling"
    ],
    "hasMindMap": true,
    "hasVideo": true,
    "hasQuestionBank": true,
    "hasQuizzes": true,
    "hasGame": true,
    "gamePath": "games/unit1-puzzle.html",
    "gameName": "Water Processing Challenge"
  },
  {
    "id": 2,
    "unitNumber": 2,
    "title": "Electrochemical Energy Storage Systems",
    "shortTitle": "Electrochemical Energy",
    "icon": "battery-charging",
    "accentColor": "#d97706",
    "status": "coming-soon",
    "description": "Battery mechanisms, lithium-ion technology, solar photovoltaic energy conversion, supercapacitor storage, and circuit analysis.",
    "topics": [
      "Electrochemical Cells & Redox Chemistry (To be confirmed)",
      "Secondary Batteries — Lead-Acid & Li-ion (To be confirmed)",
      "Solar Photovoltaic Cell Principles (To be confirmed)",
      "Electric Double-Layer Supercapacitors (To be confirmed)"
    ],
    "hasMindMap": false,
    "hasVideo": false,
    "hasQuestionBank": false,
    "hasQuizzes": false,
    "hasGame": true,
    "gamePath": "games/unit2-arcade.html",
    "gameName": "Chem-Arcade Suite"
  },
  {
    "id": 3,
    "unitNumber": 3,
    "title": "Flexible Electronics & Optoelectronic Materials",
    "shortTitle": "Flexible Electronics",
    "icon": "cpu",
    "accentColor": "#7c3aed",
    "status": "coming-soon",
    "description": "Conducting polymers, flexible optoelectronics, smart displays, OLED architectures, and thin-film devices.",
    "topics": [
      "Inherently Conducting Polymers (To be confirmed)",
      "Synthesis & Doping Mechanisms (To be confirmed)",
      "Organic Light Emitting Diodes (To be confirmed)",
      "Flexible Sensors & Wearable Devices (To be confirmed)"
    ],
    "hasMindMap": false,
    "hasVideo": false,
    "hasQuestionBank": false,
    "hasQuizzes": false,
    "hasGame": false
  },
  {
    "id": 4,
    "unitNumber": 4,
    "title": "Nanomaterials, Electrochemistry & Thermal Analysis",
    "shortTitle": "Nanomaterials & Thermal",
    "icon": "atom",
    "accentColor": "#059669",
    "status": "coming-soon",
    "description": "0D, 1D, 2D nanomaterial classification, sol-gel & chemical vapor deposition, cyclic voltammetry, and TGA/DSC thermal characterization.",
    "topics": [
      "Nanoscale Materials & Quantum Confinement (To be confirmed)",
      "Carbon Nanotubes & Graphene (To be confirmed)",
      "Cyclic Voltammetry & Corrosion Electrochemistry (To be confirmed)",
      "Thermogravimetric Analysis & DSC (To be confirmed)"
    ],
    "hasMindMap": false,
    "hasVideo": false,
    "hasQuestionBank": false,
    "hasQuizzes": false,
    "hasGame": false
  },
  {
    "id": 5,
    "unitNumber": 5,
    "title": "Energy Generation & Sustainable Fuels",
    "shortTitle": "Energy & Fuels",
    "icon": "flame",
    "accentColor": "#e11d48",
    "status": "coming-soon",
    "description": "Solid, liquid and gaseous fuels, determination of calorific values, green hydrogen production, and fuel cell technologies.",
    "topics": [
      "Calorific Value & Bomb Calorimetry (To be confirmed)",
      "Analysis of Coal (To be confirmed)",
      "Hydrogen Fuel & Clean Generation (To be confirmed)",
      "Fuel Cell Technologies (To be confirmed)"
    ],
    "hasMindMap": false,
    "hasVideo": false,
    "hasQuestionBank": false,
    "hasQuizzes": false,
    "hasGame": false
  }
],
  faculty: {
  "name": "Dr. S. S. Chine",
  "title": "Assistant Professor",
  "department": "Electronics & Computer Engineering",
  "associatedDepartment": "Electronics & Computer Engineering",
  "institution": "Sanjivani College of Engineering, Kopargaon",
  "experience": "17 Years",
  "qualifications": [
    {
      "level": "Doctorate",
      "degree": "Ph.D. in Organic Chemistry"
    }
  ],
  "photo": "assets/img/faculty-placeholder.svg",
  "cvDocument": "",
  "cvAvailable": false
},
  quizzesUnit1: {
  "unitId": 1,
  "unitTitle": "Water Processing and Environmental Sustainability",
  "quizzes": [
    {
      "id": 1,
      "quizNumber": 1,
      "title": "Quiz 1: Water Hardness & Types",
      "description": "Evaluation on hardness definitions, temporary vs. permanent hardness, and units of hardness (ppm, mg/L).",
      "googleFormUrl": "https://forms.gle/MbTbMczM7svr3Hws7",
      "_comment": "TODO: Replace with dedicated Google Form URL for Quiz 1 when available",
      "marksPublished": false,
      "marksNotice": "Marks will be published here upon completion of faculty evaluation."
    },
    {
      "id": 2,
      "quizNumber": 2,
      "title": "Quiz 2: EDTA Method & Water Softening",
      "description": "Assessment covering complexometric titration, EBT indicator, Zeolite process, and Ion-Exchange demineralization.",
      "googleFormUrl": "https://forms.gle/MbTbMczM7svr3Hws7",
      "_comment": "TODO: Replace with dedicated Google Form URL for Quiz 2 when available",
      "marksPublished": false,
      "marksNotice": "Marks will be published here upon completion of faculty evaluation."
    },
    {
      "id": 3,
      "quizNumber": 3,
      "title": "Quiz 3: Boiler Troubles & Sustainability",
      "description": "Assessment on boiler scale and sludge formation, caustic embrittlement mechanisms, and environmental water recycling.",
      "googleFormUrl": "https://forms.gle/MbTbMczM7svr3Hws7",
      "_comment": "TODO: Replace with dedicated Google Form URL for Quiz 3 when available",
      "marksPublished": false,
      "marksNotice": "Marks will be published here upon completion of faculty evaluation."
    }
  ]
},
  questionsUnit1: {
  "unitId": 1,
  "unitTitle": "Water Processing and Environmental Sustainability",
  "theory": [
    {
      "id": "q1",
      "questionNumber": 1,
      "category": "theory",
      "question": "Explain what hardness in water means. Additionally, identify and describe the two primary types of hardness.",
      "answer": {
        "definition": "Water hardness is defined as the characteristic property of water which prevents lather formation with soap, representing the soap-consuming capacity of the water sample.",
        "points": [
          "<strong>Temporary Hardness (Carbonate Hardness):</strong> Caused by dissolved bicarbonates of calcium and magnesium [Ca(HCO<sub>3</sub>)<sub>2</sub> and Mg(HCO<sub>3</sub>)<sub>2</sub>]. It is termed 'temporary' because it can be easily removed by boiling the water, precipitating insolubles: Ca(HCO<sub>3</sub>)<sub>2</sub> &rarr; CaCO<sub>3</sub>&darr; + H<sub>2</sub>O + CO<sub>2</sub>&uarr;.",
          "<strong>Permanent Hardness (Non-Carbonate Hardness):</strong> Caused by dissolved chlorides, sulfates, and nitrates of calcium and magnesium (CaCl<sub>2</sub>, CaSO<sub>4</sub>, MgCl<sub>2</sub>, MgSO<sub>4</sub>). It cannot be removed by simple boiling and requires chemical softening processes such as the Zeolite or Ion-Exchange methods."
        ]
      }
    },
    {
      "id": "q2",
      "questionNumber": 2,
      "category": "theory",
      "question": "List and explain the standard units of hardness used in water quality assessment. Demonstrate the application of the EDTA method in determining water hardness.",
      "answer": {
        "definition": "Water hardness is expressed in terms of calcium carbonate (CaCO<sub>3</sub>) equivalents because its molecular weight is exactly 100 (equivalent weight = 50), simplifying stoichiometric calculations.",
        "points": [
          "<strong>Parts Per Million (ppm):</strong> Parts of CaCO<sub>3</sub> equivalent hardness per 10<sup>6</sup> parts by weight of water (1 ppm = 1 mg/L).",
          "<strong>Milligrams per Liter (mg/L):</strong> Milligrams of CaCO<sub>3</sub> equivalent per 1 liter of water.",
          "<strong>Degree Clarke (°Cl):</strong> Grains of CaCO<sub>3</sub> equivalent per Imperial Gallon (70,000 grains) of water (1 °Cl = 14.3 ppm).",
          "<strong>Degree French (°Fr):</strong> Parts of CaCO<sub>3</sub> equivalent per 10<sup>5</sup> parts of water (1 °Fr = 10 ppm).",
          "<strong>Relationship:</strong> 1 ppm = 1 mg/L = 0.1 °Fr = 0.07 °Cl."
        ]
      }
    },
    {
      "id": "q3",
      "questionNumber": 3,
      "category": "theory",
      "question": "Provide a detailed procedure for the EDTA titration method, including the specific reagents used and the corresponding chemical reactions.",
      "answer": {
        "definition": "The EDTA (Ethylene Diamine Tetraacetic Acid) method is a complexometric titration technique for determining total, temporary, and permanent hardness in water samples.",
        "points": [
          "<strong>Key Reagents:</strong> Standard 0.01 M Disodium EDTA solution, Ammonia buffer solution (NH<sub>4</sub>Cl + NH<sub>4</sub>OH) maintaining pH 9.0–10.0, and Eriochrome Black T (EBT) indicator.",
          "<strong>Step 1:</strong> Pipette 50 mL of water sample into a conical flask. Add 2–3 mL of ammonia buffer (pH 10) and 2–3 drops of 0.5% EBT indicator. The solution turns wine-red due to the formation of an unstable metal-indicator complex: Ca<sup>2+</sup> / Mg<sup>2+</sup> + EBT &rarr; [Ca/Mg-EBT] (Unstable, Wine-Red).",
          "<strong>Step 2:</strong> Titrate with standard EDTA from the burette. EDTA chelates free Ca<sup>2+</sup> and Mg<sup>2+</sup> ions first.",
          "<strong>Endpoint:</strong> At the stoichiometric equivalence point, EDTA displaces EBT from the wine-red complex because EDTA forms a far more stable coordination chelate: [Ca/Mg-EBT] (Wine-Red) + EDTA &rarr; [Ca/Mg-EDTA] (Stable Chelate, Colorless) + EBT (Free Indicator, Steel Blue). The endpoint is marked by a sharp transition from wine-red to steel blue."
        ]
      }
    },
    {
      "id": "q4",
      "questionNumber": 4,
      "category": "theory",
      "question": "Simplify the mechanism of complexometric titration. Illustrate how water hardness is measured using the EDTA chelation method.",
      "answer": {
        "definition": "Complexometric titration involves the formation of a distinct coordination complex between metal ions (analyte) and a chelating agent (titrant).",
        "points": [
          "EDTA is a hexadentate ligand possessing two nitrogen donor atoms and four carboxylate oxygen donor atoms, creating an octahedral chelate cage around the central divalent metal cation (Ca<sup>2+</sup> / Mg<sup>2+</sup>).",
          "Because the stability constant of [M-EDTA]<sup>2-</sup> is substantially greater than that of [M-EBT]<sup>-</sup>, EDTA effectively strips the metal cation from the indicator, liberating free uncomplexed EBT which exhibits a characteristic pure blue color at basic pH 10."
        ]
      }
    },
    {
      "id": "q5",
      "questionNumber": 5,
      "category": "theory",
      "question": "Interpret the concept of water softening. Explain the chemical mechanism and application of the Zeolite (Permutit) Process.",
      "answer": {
        "definition": "Water softening is the chemical or physical removal of hardness-causing polyvalent cations (chiefly Ca<sup>2+</sup> and Mg<sup>2+</sup>) from water.",
        "points": [
          "<strong>Zeolite Formula:</strong> Hydrated sodium aluminosilicate, represented empirically as Na<sub>2</sub>O&middot;Al<sub>2</sub>O<sub>3</sub>&middot;xSiO<sub>2</sub>&middot;yH<sub>2</sub>O or simply Na<sub>2</sub>Z.",
          "<strong>Softening Reactions:</strong> Hard water is percolated through a bed of granular zeolite: Na<sub>2</sub>Z + Ca(HCO<sub>3</sub>)<sub>2</sub> &rarr; CaZ + 2NaHCO<sub>3</sub>; Na<sub>2</sub>Z + MgSO<sub>4</sub> &rarr; MgZ + Na<sub>2</sub>SO<sub>4</sub>.",
          "<strong>Regeneration:</strong> When the zeolite bed becomes exhausted (converted entirely to CaZ and MgZ), it is regenerated by backwashing with a 5%–10% brine (NaCl) solution: CaZ / MgZ + 2NaCl &rarr; Na<sub>2</sub>Z + CaCl<sub>2</sub> / MgCl<sub>2</sub>."
        ]
      }
    },
    {
      "id": "q6",
      "questionNumber": 6,
      "category": "theory",
      "question": "Explain how de-ionization/demineralization treats water and how ion-exchange resins operate.",
      "answer": {
        "definition": "The Ion-Exchange (Demineralization) process removes virtually all dissolved mineral salts, both cations and anions, producing high-purity water with electrical conductivity below 0.1 &mu;S/cm.",
        "points": [
          "<strong>Cation Exchange Resin (RH<sup>+</sup>):</strong> Contains acidic active functional groups (such as sulfonic acid -SO<sub>3</sub>H). Replaces all dissolved cations with H<sup>+</sup> ions: 2RH + Ca<sup>2+</sup> &rarr; R<sub>2</sub>Ca + 2H<sup>+</sup>. Regenerated with dilute HCl or H<sub>2</sub>SO<sub>4</sub>.",
          "<strong>Anion Exchange Resin (ROH<sup>-</sup>):</strong> Contains basic quaternary ammonium active groups [-N<sup>+</sup>(CH<sub>3</sub>)<sub>3</sub>OH<sup>-</sup>]. Replaces all dissolved anions with OH<sup>-</sup> ions: R'OH + Cl<sup>-</sup> &rarr; R'Cl + OH<sup>-</sup>. Regenerated with dilute NaOH.",
          "<strong>Neutralization:</strong> Released H<sup>+</sup> and OH<sup>-</sup> combine instantly to form pure neutral water: H<sup>+</sup> + OH<sup>-</sup> &rarr; H<sub>2</sub>O.",
          "<strong>Degasifier:</strong> The demineralized effluent passes through a degasifier tower where warm air strips dissolved volatile CO<sub>2</sub> gas."
        ]
      }
    },
    {
      "id": "q7",
      "questionNumber": 7,
      "category": "theory",
      "question": "Explain briefly what scale and sludge formation are in high-pressure industrial boiler systems and why they occur.",
      "answer": {
        "definition": "As water continuously evaporates into steam inside industrial boilers, dissolved mineral impurities concentrate until their solubility limits are exceeded, precipitating as sludges or scales.",
        "points": [
          "<strong>Sludge:</strong> A soft, slimy, non-adherent precipitate formed in cooler zones of the boiler by salts with high retrograde solubility (e.g., MgCO<sub>3</sub>, MgCl<sub>2</sub>, CaCl<sub>2</sub>). Sludge can be removed periodically via blowdown valves.",
          "<strong>Scale:</strong> A hard, adherent, stone-like crust cemented tightly onto the inner metallic heating surfaces of boiler tubes (e.g., CaSO<sub>4</sub>, CaCO<sub>3</sub>, silicates).",
          "<strong>Disadvantages of Scale:</strong> Poor thermal conductor (100 times worse than steel), leading to massive fuel wastage, overheating, tube blistering, rupture, and catastrophic explosion risks."
        ]
      }
    },
    {
      "id": "q8",
      "questionNumber": 8,
      "category": "theory",
      "question": "Describe 'Caustic Embrittlement' in boilers. Why is its prevention critical in power plants?",
      "answer": {
        "definition": "Caustic Embrittlement is a hazardous form of localized stress-corrosion cracking that occurs in high-pressure mild steel boilers at hairline cracks, rivets, and joint welds under high mechanical stress.",
        "points": [
          "<strong>Cause:</strong> Water softened using sodium carbonate (Na<sub>2</sub>CO<sub>3</sub>) undergoes high-temperature hydrolysis inside the boiler: Na<sub>2</sub>CO<sub>3</sub> + H<sub>2</sub>O &rarr; 2NaOH + CO<sub>2</sub>&uarr;.",
          "<strong>Mechanism:</strong> Dilute alkaline boiler water seeps into micro-crevices and rivets. Steam escapes through the micro-fissures, causing localized NaOH concentration to skyrocket up to 10%–20%. Concentrated NaOH dissolves boiler iron as sodium ferroate [Na<sub>2</sub>FeO<sub>2</sub>], turning the metal brittle.",
          "<strong>Prevention:</strong> Adding Sodium Nitrate (NaNO<sub>3</sub>), tannin, or lignin (which seal micro-fissures), or conditioning boiler water with Sodium Phosphate (Na<sub>3</sub>PO<sub>4</sub>) instead of sodium carbonate."
        ]
      }
    },
    {
      "id": "q9",
      "questionNumber": 9,
      "category": "theory",
      "question": "Provide a comprehensive explanation of environmental sustainability in water processing, supported by an engineering example.",
      "answer": {
        "definition": "Environmental sustainability in water processing signifies meeting current industrial and societal water needs without depleting aquifer reserves or causing ecological degradation for future generations.",
        "points": [
          "Encompasses the 3R paradigm: <strong>Reduce</strong> fresh water consumption, <strong>Recycle</strong> process wastewater, and <strong>Reclaim</strong> valuable chemical by-products from effluents.",
          "<strong>Engineering Example:</strong> Zero Liquid Discharge (ZLD) plants in chemical processing complexes. Effluent undergoes secondary biological digestion, ultrafiltration, reverse osmosis (RO) desalination, and multi-effect evaporation (MEE). Over 95% of purified water is recycled back to cooling towers, while crystallized dry salt residues are reclaimed for industrial raw material."
        ]
      }
    }
  ],
  "numericals": [
    {
      "id": "n1",
      "problemNumber": 1,
      "category": "numerical",
      "title": "Determination of Total Hardness using Standard EDTA",
      "problemStatement": "A 100 mL sample of hard water required 12.7 mL of 0.01 M EDTA solution for complete titration using Eriochrome Black T indicator at pH 10. Calculate the total hardness of the water sample in ppm.",
      "given": [
        "Volume of water sample (V<sub>water</sub>) = 100 mL",
        "Volume of EDTA required (V<sub>EDTA</sub>) = 12.7 mL",
        "Molarity of EDTA (M<sub>EDTA</sub>) = 0.01 M"
      ],
      "formula": "Total Hardness (in ppm) = [ (V<sub>EDTA</sub> &times; M<sub>EDTA</sub> &times; 100 &times; 1000) / V<sub>water</sub> ] = [ (V<sub>EDTA</sub> &times; M<sub>EDTA</sub> &times; 10<sup>5</sup>) / V<sub>water</sub> ]",
      "steps": [
        {
          "stepTitle": "1. Stoichiometric Relationship",
          "explanation": "1 mL of 0.01 M EDTA &equiv; 1 mg of CaCO<sub>3</sub> equivalent hardness."
        },
        {
          "stepTitle": "2. Substitute Values into the Standard Hardness Equation",
          "calculation": "Total Hardness = (12.7 mL &times; 0.01 M &times; 100,000) / 100 mL"
        },
        {
          "stepTitle": "3. Compute Final Hardness",
          "calculation": "Total Hardness = 12,700 / 100 = 127 ppm (or mg/L)"
        }
      ],
      "answer": "127 ppm"
    },
    {
      "id": "n2",
      "problemNumber": 2,
      "category": "numerical",
      "title": "Carbonate vs. Non-Carbonate Hardness before and after Boiling",
      "problemStatement": "A 100 mL water sample consumed 15.6 mL of 0.01 M EDTA before boiling. Another 100 mL of the same water sample was boiled, filtered to remove precipitates, and diluted back to 100 mL; it then consumed 10.7 mL of 0.01 M EDTA. Calculate the Total, Carbonate (temporary), and Non-Carbonate (permanent) hardness of the sample in ppm.",
      "given": [
        "Volume of water sample = 100 mL",
        "Volume of EDTA before boiling (V<sub>total</sub>) = 15.6 mL",
        "Volume of EDTA after boiling (V<sub>perm</sub>) = 10.7 mL",
        "Molarity of EDTA = 0.01 M"
      ],
      "formula": "Total Hardness = (V<sub>total</sub> &times; M &times; 10<sup>5</sup>) / V<sub>water</sub><br>Permanent Hardness = (V<sub>perm</sub> &times; M &times; 10<sup>5</sup>) / V<sub>water</sub><br>Temporary (Carbonate) Hardness = Total Hardness - Permanent Hardness",
      "steps": [
        {
          "stepTitle": "1. Compute Total Hardness (before boiling)",
          "calculation": "Total Hardness = (15.6 &times; 0.01 &times; 10<sup>5</sup>) / 100 = 15,600 / 100 = 156 ppm"
        },
        {
          "stepTitle": "2. Compute Permanent (Non-Carbonate) Hardness (after boiling)",
          "calculation": "Permanent Hardness = (10.7 &times; 0.01 &times; 10<sup>5</sup>) / 100 = 10,700 / 100 = 107 ppm"
        },
        {
          "stepTitle": "3. Compute Temporary (Carbonate) Hardness",
          "calculation": "Carbonate Hardness = Total Hardness - Permanent Hardness = 156 - 107 = 49 ppm"
        }
      ],
      "answer": "Total Hardness = 156 ppm, Permanent Hardness = 107 ppm, Carbonate Hardness = 49 ppm"
    },
    {
      "id": "n3",
      "problemNumber": 3,
      "category": "numerical",
      "title": "Two-Step Titration: Standardizing EDTA against CaCO3",
      "problemStatement": "0.5 g of pure CaCO<sub>3</sub> was dissolved in dilute HCl and made up to 500 mL in a volumetric flask. 50 mL of this standard hard water required 48 mL of an EDTA solution. Next, 25 mL of an unknown hard water sample required 7.5 mL of the same EDTA solution. After boiling 25 mL of the water sample, filtering, and cooling, it consumed 5.0 mL of EDTA. Calculate: (i) Molarity of standard CaCO<sub>3</sub>, (ii) Molarity of EDTA, and (iii) Total, Permanent, and Temporary hardness in ppm.",
      "given": [
        "Mass of pure CaCO<sub>3</sub> = 0.5 g, Volume = 500 mL (0.5 L)",
        "Volume of standard CaCO<sub>3</sub> titrated = 50 mL, EDTA consumed = 48 mL",
        "Volume of unknown water sample = 25 mL",
        "EDTA consumed by raw sample = 7.5 mL; EDTA consumed after boiling = 5.0 mL"
      ],
      "formula": "M<sub>CaCO3</sub> = (Mass / Molar Mass) / Volume (L)<br>M<sub>EDTA</sub> = (M<sub>CaCO3</sub> &times; V<sub>CaCO3</sub>) / V<sub>EDTA</sub><br>Hardness = [ (V<sub>EDTA</sub> &times; M<sub>EDTA</sub> &times; 100 &times; 1000) / V<sub>sample</sub> ]",
      "steps": [
        {
          "stepTitle": "1. Calculate Molarity of Standard CaCO3 Solution",
          "calculation": "M<sub>CaCO3</sub> = (0.5 g / 100 g/mol) / 0.5 L = 0.005 mol / 0.5 L = 0.01 M"
        },
        {
          "stepTitle": "2. Calculate Exact Molarity of EDTA Solution",
          "calculation": "M<sub>EDTA</sub> &times; V<sub>EDTA</sub> = M<sub>CaCO3</sub> &times; V<sub>CaCO3</sub> &rArr; M<sub>EDTA</sub> &times; 48 = 0.01 &times; 50 &rArr; M<sub>EDTA</sub> = 0.5 / 48 &approx; 0.0104 M"
        },
        {
          "stepTitle": "3. Calculate Total Hardness of Sample",
          "calculation": "Total Hardness = (7.5 / 25) &times; 0.0104 &times; 10<sup>5</sup> = 0.3 &times; 1,040 = 312 ppm"
        },
        {
          "stepTitle": "4. Calculate Permanent Hardness (after boiling)",
          "calculation": "Permanent Hardness = (5.0 / 25) &times; 0.0104 &times; 10<sup>5</sup> = 0.2 &times; 1,040 = 208 ppm"
        },
        {
          "stepTitle": "5. Calculate Temporary Hardness",
          "calculation": "Temporary Hardness = Total Hardness - Permanent Hardness = 312 - 208 = 104 ppm"
        }
      ],
      "answer": "Total Hardness = 312 ppm, Permanent Hardness = 208 ppm, Temporary Hardness = 104 ppm"
    },
    {
      "id": "n4",
      "problemNumber": 4,
      "category": "numerical",
      "title": "Standardization using Zinc Sulfate & Hardness Estimation",
      "problemStatement": "0.8 g of ZnSO<sub>4</sub> (molecular weight = 161.4 g/mol) was dissolved in distilled water and diluted to 250 mL. 25 mL of this standard ZnSO<sub>4</sub> solution required 14.3 mL of an EDTA solution. Then, 50 mL of an unknown hard water sample required 8.6 mL of this EDTA solution. Calculate the total hardness of the water sample in ppm.",
      "given": [
        "Mass of ZnSO<sub>4</sub> = 0.8 g, Volume = 250 mL (0.25 L)",
        "Molar Mass of ZnSO<sub>4</sub> = 161.4 g/mol",
        "Volume of ZnSO<sub>4</sub> titrated = 25 mL, EDTA consumed = 14.3 mL",
        "Volume of unknown water sample = 50 mL, EDTA consumed = 8.6 mL"
      ],
      "formula": "M<sub>ZnSO4</sub> = (Mass / Molar Mass) / Volume (L)<br>M<sub>EDTA</sub> = (M<sub>ZnSO4</sub> &times; V<sub>ZnSO4</sub>) / V<sub>EDTA</sub><br>Total Hardness in ppm = (V<sub>EDTA</sub> &times; M<sub>EDTA</sub> &times; 100 &times; 1000) / V<sub>water</sub>",
      "steps": [
        {
          "stepTitle": "1. Molarity of ZnSO4 Standard Solution",
          "calculation": "M<sub>ZnSO4</sub> = (0.8 / 161.4) / 0.25 = 0.004956 mol / 0.25 L = 0.019826 M (approx. 0.0198 M)"
        },
        {
          "stepTitle": "2. Calculate Molarity of EDTA Solution",
          "calculation": "M<sub>EDTA</sub> = (0.019826 &times; 25) / 14.3 = 0.49566 / 14.3 = 0.03466 M (approx. 0.0347 M)"
        },
        {
          "stepTitle": "3. Calculate Total Hardness in terms of CaCO3 Equivalents",
          "calculation": "Total Hardness = (8.6 &times; 0.03466 &times; 100 &times; 1000) / 50 = 29,807.6 / 50 = 596.15 ppm &approx; 596 ppm"
        }
      ],
      "answer": "596 ppm"
    },
    {
      "id": "n5",
      "problemNumber": 5,
      "category": "numerical",
      "title": "Mass of Dissolved Salt Required to Produce Specific Hardness",
      "problemStatement": "Calculate the amount of magnesium chloride (MgCl<sub>2</sub>) in grams required per liter of water to produce a hardness equivalent of 76 ppm.",
      "given": [
        "Desired CaCO<sub>3</sub> equivalent hardness = 76 ppm = 76 mg/L",
        "Molecular weight of CaCO<sub>3</sub> = 100 (Equivalent weight = 50)",
        "Molecular weight of MgCl<sub>2</sub> = 95 (Equivalent weight = 95 / 2 = 47.5)"
      ],
      "formula": "CaCO<sub>3</sub> equivalent = [ Mass of Hardness Substance (mg/L) &times; (Equivalent Weight of CaCO<sub>3</sub> / Equivalent Weight of Substance) ]<br>&rArr; Mass of MgCl<sub>2</sub> (mg/L) = Hardness in ppm &times; (Equivalent Weight of MgCl<sub>2</sub> / Equivalent Weight of CaCO<sub>3</sub>)",
      "steps": [
        {
          "stepTitle": "1. Understand Equivalent Weight Ratio",
          "explanation": "Equivalent weight of CaCO<sub>3</sub> = 100 / 2 = 50. Equivalent weight of MgCl<sub>2</sub> = 95 / 2 = 47.5."
        },
        {
          "stepTitle": "2. Calculate Required MgCl2 in mg/L",
          "calculation": "76 &times; (47.5 / 50) = 72.2 mg/L"
        },
        {
          "stepTitle": "3. Convert to Grams per Liter",
          "calculation": "Mass in g/L = 72.2 / 1000 = 0.0722 g of MgCl<sub>2</sub> per liter of water."
        }
      ],
      "answer": "72.2 mg/L (or 0.0722 g/L)"
    }
  ]
},
};

window.loadEchemData = async function(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Status ' + res.status);
    return await res.json();
  } catch (err) {
    if (path.includes('units.json')) return window.EchemData.units;
    if (path.includes('faculty.json')) return window.EchemData.faculty;
    if (path.includes('quizzes')) return window.EchemData.quizzesUnit1;
    if (path.includes('questions')) return window.EchemData.questionsUnit1;
    if (path.includes('elements.json')) {
      if (window.EchemData && window.EchemData.elements) return window.EchemData.elements;
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          const isSubdir = window.location.pathname.includes('/pages/') || window.location.pathname.includes('/games/');
          script.src = (isSubdir ? '../' : './') + 'assets/js/elements-data.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        if (window.EchemData && window.EchemData.elements) return window.EchemData.elements;
      } catch (scriptErr) {
        console.warn('Failed to load elements-data.js fallback:', scriptErr);
      }
    }
    console.warn('Fallback not found for:', path);
    throw err;
  }
};
