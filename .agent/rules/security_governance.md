# Global Security Governance

1.  **Security First:** Never generate code that uses `dangerouslySetInnerHTML` without a warning.
2.  **Firebase Best Practice:** Never suggest `allow read, write: if true;` for Firestore rules, even for testing. Always suggest authenticated access at a minimum.
3.  **Audit Awareness:** If the user modifies `firestore.rules`, automatically offer to run the `security_audit` skill.
