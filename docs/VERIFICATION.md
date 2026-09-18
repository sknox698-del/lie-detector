# Verification and publication review

Reviewed on 2026-09-18 using Node.js 24.19.0 on Windows.

## Results

| Check | Result |
| --- | --- |
| Locked clean install (`npm ci`) | Passed; 560 packages installed |
| TypeScript (`npm run typecheck`) | Passed |
| Game smoke checks (`npm test`) | Passed for 48 sampled seed/difficulty combinations |
| Web export (`npm run build:web`) | Passed; 1,131 modules bundled |
| Browser navigation | Boot, menu, case selection, briefing, investigation and interview opened |
| Interview interaction | Selecting a question added dialogue and changed suspect state |
| Source hygiene scan | No credential/private-key/email matches found in reviewed publishable text |
| Ignore checks | Environment files, player backup, APK, dependencies, Expo cache and web output excluded |

The logic check covers eight seeds (including zero and unsigned 32-bit boundaries) at each of six difficulty levels: repeatable generation, reversible case codes, a single culprit at the crime scene, key evidence references, and correct/wrong accusation outcomes. It also checks rejection of an invalid code. These are sampled checks, not exhaustive validation of all possible cases.

The browser reported an audio autoplay `NotAllowedError` before the first interaction. Navigation and interview interaction still worked. Audio behavior needs a separate browser/mobile pass. The desktop interview screen was visually inspected; phone layout and native builds were not validated in this review.

## Cleanup scope

- Source came from the existing Lie Detector mobile-game archive.
- At initial publication, all 62 retained original files outside the four edited configuration files matched the archive byte-for-byte, including gameplay code and assets. The subsequent ownership clarification moved the original license notice unchanged to `notices/EXPO-MIT-LICENSE.txt` and added a separate notice for original contributions.
- Configuration changes: project name/slug, removal of the old Expo preview owner/project/update endpoint, useful npm scripts and broader ignore rules.
- Dependency versions were preserved; only the root package name changed in the lockfile.
- Added README, Git attributes, these verification notes and repeatable logic checks.
- Excluded local assistant settings/instructions from the public copy; retained the version-specific contributor guidance in `AGENTS.md`.
- Existing original archives, APK and player backup were not modified. No old Git history was imported.
- Required PNG/WAV runtime assets are included; compiled application binaries and generated output are not.

## Ownership and project status clarification

The maintainer confirmed ownership of the original app and assets and clarified that no further standalone development is planned. Ideas from Lie Detector and The Empire are intended for another project. That future work is outside this repository's implemented scope.

Original contributions are marked all rights reserved. The archive's Expo MIT notice is preserved verbatim as a separate upstream notice; third-party licenses and previously granted permissions remain unaffected. Package metadata uses UNLICENSED to avoid implying a general open-source license for the original project.

The known limitations above remain documented rather than promised as a development roadmap. If distribution is reconsidered, native signing/project configuration, full device testing and release verification would still be needed. Gameplay code, assets and dependency versions were not changed by this documentation and licensing update.

No dependency upgrades or audit remediation were performed. The install reported an upstream deprecation warning for `uuid@7.0.3`; this review does not certify dependency security.
