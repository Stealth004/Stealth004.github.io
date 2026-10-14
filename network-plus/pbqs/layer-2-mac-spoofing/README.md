# Network+ PBQ — Layer 2 MAC Spoofing

Independent interactive practice simulation reconstructed from provided screenshots, for **CompTIA Network+ N10-009** study.

## Open the lab

**GitHub Pages (when enabled):** https://stealth004.github.io/network-plus/pbqs/layer-2-mac-spoofing/

**Source folder:** https://github.com/Stealth004/Stealth004.github.io/tree/main/network-plus/pbqs/layer-2-mac-spoofing

If the website URL returns a 404, go to this repository's **Settings → Pages** and configure **Deploy from a branch → main → /(root)**. Wait for GitHub Pages to finish deploying.

## Practice instructions

1. Open **Situation** and read the VLAN 20 environment and user report.
2. Select the suspected offending device in the network topology.
3. Inspect the recorded MAC table entries and choose the relevant mitigation controls.
4. Choose the attack and primary indicator in the dropdowns.
5. Select **Finish & Grade** for detailed feedback and a score out of seven.
6. Select **Try Again** or **Reset PBQ** to practice again.

### Scoring

| Assessment | Points |
|---|---:|
| Identify offending host | 1 |
| Identify attack type | 1 |
| Identify primary MAC-table indicator | 1 |
| Four switch-side mitigation selections, independently scored | 4 |
| **Total** | **7** |

The solution and reasoning remain concealed until **Finish & Grade**. A reset clears selections. The browser saves in-progress selections on the current device using local storage; no account, server, installation, or external library is required.

## Project files

- `index.html`: Network topology, switch evidence, controls, questions, feedback.
- `styles.css`: Responsive styling including mobile layouts.
- `app.js`: Local interactions, state persistence, answer checking, scoring.
- `README.md`: This reference document.

To run locally, download these files into the same folder and open `index.html` in your browser.

## Technical learning note

In the screenshot, the gateway MAC is represented on two ports in one synthetic exercise table. An actual learning switch ordinarily keeps one active forwarding port per MAC/VLAN; MAC movement or flapping would be investigated through logs and samples over time.

This is a learning replica, not an official CompTIA PBQ or a Cyberkraft product. No trademarks or external graphics are required for the implementation.
