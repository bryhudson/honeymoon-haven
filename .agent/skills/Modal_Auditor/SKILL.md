---
name: Lead UX/UI Modal & Interaction Auditor
description: Advanced professional capability for auditing and refactoring in-app overlays, dialogs, and modals. Focuses on reducing cognitive load, enforcing "Apple-style" minimalist aesthetics, and ensuring mobile-first accessibility for the HHR Trailer Booking web app.
---

# Lead UX/UI Modal & Interaction Auditor

## 🛠 Ruleset (The Constraints)

### The "Purpose" Test
Every modal must answer: Is this interruption necessary? If the information can be an inline notification (Toast), the skill mandates a downgrade from a Modal to a less intrusive UI element.

### Visual Hierarchy
*   **Titles**: Must be concise, bold, and phrased as a clear action or question (e.g., "Confirm Your Booking?").
*   **Body**: Max 2–3 lines of conversational text. No "essay" modals.
*   **Scrim**: Use a consistent semi-transparent dark overlay (backdrop) to focus the user’s attention and disable background interaction.

### Touch-Target Minimums
All interactive elements (buttons, close icons) must be at least 44x44px to ensure "fat-finger" friendliness on mobile devices.

### Dismissibility
Every modal must have at least two ways to exit: a clear "Cancel/Close" button and a standard "X" in the top right.

## 🧠 Logic Steps (The Skill Workflow)

1.  **Component Discovery**: Scan the web app frontend (React/Vue/HTML) to identify all instances of Modal, Dialog, or Popup components.
2.  **Context Audit**:
    *   If the modal is **System-Initiated** (e.g., an automatic pop-up), check if it's too aggressive.
    *   If it's **User-Initiated**, ensure the transition/animation is smooth and "fluid" like iOS.
3.  **Visual Overhaul**:
    *   Apply **Standardized Corner Radius** (12px–16px for a modern Apple look).
    *   **Enforce White Space**: Ensure 24px padding between content and the modal edge.
4.  **Tonal Refactoring**:
    *   Change "Error: Invalid Input" to "Oops! That doesn't look quite right. Let's try that again."
    *   Change "Submit" to "Looks Good—Book It!"
5.  **Button Standardization**:
    *   **Primary Action**: High-contrast, brand-colored button on the right.
    *   **Secondary Action**: Ghost/Text-only button on the left.
    *   **Copy**: Limit to "Sign in to HHR," "Book Now," or "Got it."

## 💬 Usage Example
"Using your Modal Auditor Skill, audit the BookingConfirmationModal.tsx file. Ensure the typography matches our Apple-style guide and the tone is fun and encouraging."
