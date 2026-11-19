# Security

Encore has no server: all data lives in the device's IndexedDB, and the app sends nothing over the network.
Even so, if you find a vulnerability (for example in backup import or in the service worker),
**do not open a public issue**: use "Report a vulnerability" in the repository's _Security_ tab on GitHub.

## Data privacy

- The backup (`encore-backup-*.json`) is plain text, with no encryption. Keep it the way you would keep any personal data.
- Importing a backup only **adds or updates** data and validates every record; malformed files are rejected.
