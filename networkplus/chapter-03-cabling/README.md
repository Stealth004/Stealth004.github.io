# NET-005A — Chapter 3 Cable & Connector Simulation

**CompTIA Network+ N10-009 · Sybex Study Guide (6th ed.) · Chapter 3: Networking Connectors and Wiring Standards**

A standalone, mobile-friendly browser lab with original vector diagrams and scenario questions. No sign-in, backend, external libraries, or build process.

## Launch
- **GitHub Pages path (if Pages publishes the repository main branch):** https://stealth004.github.io/networkplus/chapter-03-cabling/
- **Offline:** Download this folder, then open index.html in a modern browser.
- **Source:** index.html, style.css, app.js in this directory.

If GitHub Pages has not been configured for this repository, enable Settings → Pages → Deploy from a branch → main / (root). None of the website's existing root files were modified.

## What's included

| Module | Task | Learning objective |
|---|---|---|
| 01 · Atlas | Compare 6 media and 10 connector/transceiver families | Relate physical construction to applications and limitations |
| 02 · RJ45 bench | Assign all 16 conductor positions across two ends | Build T568A, T568B, straight-through, and crossover |
| 03 · Design a Link | Solve 6 constraint scenarios | Select medium, termination and fire/environmental rating |
| 04 · Fault Finder | Diagnose 6 link failures | Select evidence-gathering test → cause → correction → verification |
| 05 · Exam Arena | Answer 18 original scenarios | Get guided rationales or an independent attempt with delayed feedback |
| 06 · Functional Map | Link concepts in a mental model | Explain causes, constraints, tests and symptoms |

## Recommended 35–50 minute training cycle
1. **5–8 min: Predict.** Decide which medium suits a scenario before checking the Atlas, then explain why alternatives do not.
2. **10 min: Build.** Wire T568A and T568B from memory. Attempt the reference only after trying.
3. **10 min: Compare.** Solve link-design problems by eliminating answers that violate interface, reach or environment constraints.
4. **10 min: Diagnose.** Solve faults using observation → test → isolate → correct → verify. Do not change IP settings for an obvious Layer 1 symptom.
5. **5–10 min: Retrieve.** Complete Independent Exam. Revisit items marked weak after a delay.

## Reasoning and exam logic
- 10GBASE-T at a 100 m channel generally uses Category 6A compliant components.
- T568A/B exchange the green and orange pairs. The same standard at both ends is straight-through; A/B is a traditional Ethernet crossover pattern. Modern Auto-MDI-X ports often make crossovers unnecessary.
- Jacket rating is about applicable building/fire code, not throughput. Plenum requirements depend on construction, jurisdiction and listing.
- A pluggable transceiver form factor does not alone guarantee compatibility; match optical type, wavelength, media, speed and optical budget.
- Fiber connectors need correct TX/RX polarity and clean optical surfaces. Do not look into active fiber.
- All diagrams are illustrative, not scale drawings, and this is not a vendor equipment simulator.

## Progress and privacy
Learning progress is stored locally in the browser using localStorage under key net005a-ch3-v1. The simulator does not send user answers to a server or include analytics. Progress is specific to the browser and device and can be cleared using Reset progress.

## Verified QA and remaining checks
- [x] JavaScript parsed successfully after source review.
- [x] Module navigation and diagrams rendered in a simulated DOM.
- [x] Wiring check validated complete 16-pin B/B mapping.
- [x] Design scenario and full fault test/cause/fix flow executed.
- [x] Guided exam answer/reasoning and functional map exercised.
- [ ] Verify live Pages hosting and manual desktop/mobile browser rendering.

## References
- Objectives 1.5 (transmission media and transceivers) and 5.2 (cabling and physical-interface troubleshooting), N10-009.
- Lammle, T., & Buhagiar, J. (2024). CompTIA Network+ Study Guide: Exam N10-009 (6th ed.), Chapter 3, Wiley.
- [Wiley chapter table of contents](https://www.wiley.com/en-in/comptia-network-study-guide-exam-n10-009-6th-edition-p-9781394235612)
- [Official exam objectives PDF](https://comptiacdn.azureedge.net/webcontent/docs/default-source/exam-objectives/comptia-network-n10-009-exam-objectives-%284-0%29-%281%29.pdf)

Original simulator exercises, questions and instructional diagrams. This complements the broader NET-001/NET-002 training portfolio without modifying those simulations.