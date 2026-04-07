---
name: design-guidelines
description: "Use when building, modifying, or reviewing any UI component, modal, button, or page layout in the HHR system. Reference before writing any className string to ensure consistent typography, color, spacing, and interaction patterns."
---

# HHR Design Guidelines

Canonical design system for the Honeymoon Haven Resort Booking Platform.
Every component, modal, and page MUST conform to these rules. No ad-hoc styling.

> **Philosophy:** Apple-inspired minimalism. Mobile-first. Premium feel. If it doesn't feel like a luxury resort app, it's wrong.

---

## 1. Typography

### Font Stack

| Property      | Value                          |
|---------------|--------------------------------|
| **Family**    | `'Inter', sans-serif`          |
| **Weights**   | 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold) |
| **Fallback**  | System sans-serif              |
| **Import**    | Google Fonts via `<link>` in `index.html` |

**Do NOT** use `font-black` (`900`) for body-level UI. Reserve `font-black` ONLY for hero/marketing contexts (WelcomeModal, landing pages).

### Type Scale

| Element                | Tailwind Classes                                | Notes                          |
|------------------------|-------------------------------------------------|--------------------------------|
| **Page Title (H1)**    | `text-2xl md:text-3xl font-bold text-slate-900` | One per page. Always.          |
| **Section Title (H2)** | `text-xl font-bold text-slate-900`              | Card headers, section dividers |
| **Modal Title (H3)**   | `text-xl font-bold text-slate-900 leading-none` | Set by BaseModal automatically |
| **Subsection (H4)**    | `text-base font-semibold text-slate-800`        | Tab labels, group headers      |
| **Body**               | `text-sm text-slate-600 leading-relaxed`        | Default paragraph text         |
| **Body (emphasized)**  | `text-sm font-medium text-slate-700`            | Inline labels, key info        |
| **Caption / Helper**   | `text-xs text-slate-500`                        | Timestamps, metadata, hints    |
| **Overline / Badge**   | `text-xs font-bold uppercase tracking-wide`     | Status pills, category tags    |

### Typography Rules

- **Minimum body size:** `text-sm` (14px). Never use `text-xs` for readable body text.
- **Line height:** Always use `leading-relaxed` (1.625) for multi-line body text.
- **Line length:** Cap at `max-w-prose` (~65ch) for readability in wide layouts.
- **No em dashes.** Use hyphens, commas, or colons instead. (Non-negotiable project rule.)

---

## 2. Color System

### Semantic Palette

| Role             | Color Token           | Tailwind Class         | Hex (approx)   |
|------------------|-----------------------|------------------------|-----------------|
| **Primary**      | Indigo 600            | `bg-indigo-600`        | `#4F46E5`       |
| **Primary Hover**| Indigo 700            | `hover:bg-indigo-700`  | `#4338CA`       |
| **Primary Light**| Indigo 50             | `bg-indigo-50`         | `#EEF2FF`       |
| **Destructive**  | Rose 600              | `bg-rose-600`          | `#E11D48`       |
| **Destructive Hover** | Rose 700         | `hover:bg-rose-700`    | `#BE123C`       |
| **Success**      | Emerald 600           | `bg-emerald-600`       | `#059669`       |
| **Warning**      | Amber 500             | `bg-amber-500`         | `#F59E0B`       |
| **Neutral BG**   | Slate 50              | `bg-slate-50`          | `#F8FAFC`       |
| **Text Primary** | Slate 900             | `text-slate-900`       | `#0F172A`       |
| **Text Body**    | Slate 600             | `text-slate-600`       | `#475569`       |
| **Text Muted**   | Slate 500             | `text-slate-500`       | `#64748B`       |
| **Text Disabled**| Slate 400             | `text-slate-400`       | `#94A3B8`       |
| **Border**       | Slate 200             | `border-slate-200`     | `#E2E8F0`       |
| **Border Light** | Slate 100             | `border-slate-100`     | `#F1F5F9`       |

### Color Rules

- **Primary actions = Indigo 600.** Always `bg-indigo-600 hover:bg-indigo-700 text-white`.
- **Danger actions = Rose 600.** Always `bg-rose-600 hover:bg-rose-700 text-white`.
- **Never use** `bg-blue-*`, `bg-green-*`, or `bg-red-*` for action buttons. Use `indigo`, `emerald`, `rose`.
- **Accent colors** (blue, emerald, pink, amber) are for decorative elements only: icons, badges, status pills.
- **Focus ring:** `focus:ring-2 focus:ring-indigo-500/20` for inputs and interactive elements.
- **Shadows:** Use `shadow-lg shadow-indigo-600/10` on primary buttons. Never plain `shadow-lg`.

---

## 3. Spacing & Layout

### Spacing Scale

| Context              | Value        | Tailwind   |
|----------------------|--------------|------------|
| **Page padding**     | 16px mobile  | `p-4`      |
| **Page padding**     | 24-32px desktop | `md:p-6 lg:p-8` |
| **Card padding**     | 24px         | `p-6`      |
| **Modal padding**    | 24px         | `p-6`      |
| **Section gap**      | 24px         | `space-y-6`|
| **Element gap**      | 12px         | `gap-3`    |
| **Button group gap** | 12px         | `gap-3`    |
| **Input group gap**  | 8px          | `space-y-2`|

### Layout Rules

- **Mobile-first.** Write base styles for 375px. Layer up with `md:` and `lg:`.
- **Max content width:** `max-w-6xl mx-auto` for page content.
- **Card grid:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`.
- **Modal max height:** `max-h-[90vh]` (set by BaseModal).
- **Reserve space** for fixed headers. Use `pt-20` or equivalent to prevent content under navbar.

---

## 4. Border Radius

| Element          | Radius         | Tailwind        |
|------------------|----------------|-----------------|
| **Modal shell**  | 16px           | `rounded-2xl`   |
| **Cards**        | 12px           | `rounded-xl`    |
| **Buttons**      | 12px           | `rounded-xl`    |
| **Inputs**       | 12px           | `rounded-xl`    |
| **Inner panels** | 12px           | `rounded-xl`    |
| **Badges/pills** | 9999px         | `rounded-full`  |
| **Avatars**      | 9999px         | `rounded-full`  |
| **Small chips**  | 8px            | `rounded-lg`    |

### Radius Rules

- **DO NOT** mix `rounded-md` and `rounded-xl` on sibling elements. Pick one and stay consistent.
- Modal shell is ALWAYS `rounded-2xl`. Inner content cards inside modals use `rounded-xl`.
- Action buttons in modal footers: `rounded-xl` (not `rounded-2xl`).

---

## 5. Buttons

### Button Anatomy

Every button follows this formula:

```
[padding] [background] [text-color] [font-weight] [text-size] [border-radius] [transition] [active-state]
```

### Button Variants

#### Primary Button (Default Action)
```jsx
className="py-3 px-4 min-h-[48px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
```

#### Secondary Button (Cancel / Dismiss)
```jsx
className="py-3 px-4 min-h-[48px] bg-white border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-[0.98]"
```

#### Danger Button (Destructive Action)
```jsx
className="py-3 px-4 min-h-[48px] bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-rose-600/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
```

#### Ghost Button (Tertiary / Link-style)
```jsx
className="py-2 px-3 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
```

#### Full-Width Button (Single action, no sibling)
```jsx
className="w-full py-3.5 min-h-[48px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/10 transition-all active:scale-[0.98]"
```

### Button Rules (Non-Negotiable)

| Rule                     | Specification                                     |
|--------------------------|----------------------------------------------------|
| **Min touch target**     | `min-h-[48px]` on all primary/secondary buttons    |
| **Font weight**          | `font-semibold` (600). Not `font-bold`, not `font-black` |
| **Text size**            | `text-sm` for all standard buttons                 |
| **Letter spacing**       | Default. Do NOT use `tracking-widest` or `uppercase` on standard buttons |
| **Border radius**        | `rounded-xl` always                                |
| **Active feedback**      | `active:scale-[0.98]`                              |
| **Disabled state**       | `disabled:opacity-50 disabled:cursor-not-allowed`  |
| **Transition**           | `transition-all` (covers color, shadow, transform) |
| **Icon gap**             | `gap-2` when button contains icon + text           |
| **Shadow**               | Primary/Danger get `shadow-lg shadow-{color}-600/10` |
| **Loading state**        | Replace text with spinner. Disable button.         |

#### When to use uppercase buttons

**Only** for hero/marketing CTAs in dark-themed containers (WelcomeModal, landing hero sections):
```jsx
className="... font-black uppercase tracking-widest text-xs ..."
```
Standard UI modals and forms NEVER use uppercase buttons.

### Button Layout in Modals

```jsx
<div className="flex gap-3 pt-2">
    {/* Secondary (Cancel) - always LEFT */}
    <button className="flex-1 ...secondary...">Cancel</button>
    {/* Primary (Action) - always RIGHT */}
    <button className="flex-1 ...primary...">{actionText}</button>
</div>
```

- **Two-button layout:** `flex gap-3`, both `flex-1`.
- **Single button:** `w-full`.
- **Cancel = left. Confirm = right.** Always.
- **Wrap in `pt-2`** for breathing room above buttons.

---

## 6. Modals

### Architecture

All modals MUST use `BaseModal` from `src/components/ui/BaseModal.jsx`.

```jsx
<BaseModal
    isOpen={isOpen}
    onClose={onClose}
    title="Modal Title"
    description="Optional subtitle"   // text-sm text-slate-500
    maxSize="max-w-md"                  // or max-w-lg, max-w-xl
    showClose={true}                    // X button, 44x44 touch target
    closeOnBackdrop={true}              // Click scrim to close
    footer={<ButtonRow />}              // Optional sticky footer
>
    {/* Content here */}
</BaseModal>
```

### Modal Size Guide

| Modal Type              | Max Width     |
|-------------------------|---------------|
| **Simple confirmation** | `max-w-md`    |
| **Form (1-3 fields)**   | `max-w-md`    |
| **Form (4+ fields)**    | `max-w-lg`    |
| **Complex / multi-step**| `max-w-xl`    |
| **Data-heavy / tables** | `max-w-2xl`   |

### Modal Content Spacing

```jsx
<div className="space-y-6">
    {/* Body text */}
    <p className="text-slate-600 leading-relaxed">{message}</p>

    {/* Input group */}
    <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <label className="text-xs font-bold text-slate-500 tracking-wide">Label</label>
        <input className="w-full px-4 py-3 min-h-[44px] bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
    </div>

    {/* Buttons */}
    <div className="flex gap-3 pt-2">...</div>
</div>
```

### Modal Rules

- **Backdrop:** `bg-slate-900/50 backdrop-blur-sm`. Consistent everywhere.
- **Shell:** `bg-white rounded-2xl shadow-xl`. No gradients on standard modals.
- **Dismissibility:** Every modal has Escape key + X button. `closeOnBackdrop` is true by default.
- **Max body lines:** 2-3 lines of body text. If you need more, rethink the content.
- **No nested modals.** If you need a confirmation inside a modal, use the `ConfirmationModal` pattern.
- **Dark-themed modals** (WelcomeModal, onboarding) are exceptions, set via `containerClassName`.

---

## 7. Form Inputs

### Standard Input

```jsx
className="w-full px-4 py-3 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
```

### Input Group (with label)

```jsx
<div className="space-y-2">
    <label className="text-xs font-bold text-slate-500 tracking-wide">
        Field Label
    </label>
    <input className="...standard input..." />
</div>
```

### Input Wrapped in Panel

```jsx
<div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
    <label className="text-xs font-bold text-slate-500 tracking-wide">Label</label>
    <input className="w-full px-4 py-3 min-h-[44px] bg-white border border-slate-200 rounded-lg ..." />
</div>
```

Note: When input is inside a panel (`bg-slate-50`), the input itself uses `bg-white` and `rounded-lg` (one step smaller than the panel's `rounded-xl`).

### Input Rules

- **Min touch target:** `min-h-[44px]` on all inputs, selects, textareas.
- **Background:** `bg-slate-50` for standalone. `bg-white` when inside a panel.
- **Focus:** `focus:ring-2 focus:ring-indigo-500/20`. Never use a solid ring.
- **Labels:** `text-xs font-bold text-slate-500 tracking-wide`. Always above the input.
- **Error state:** Add `border-rose-300 focus:ring-rose-500/20` and show error text below as `text-xs text-rose-600`.

---

## 8. Cards

### Standard Card

```jsx
className="bg-white border border-slate-100 rounded-xl p-6 hover:shadow-md transition-shadow"
```

### Interactive Card (clickable)

```jsx
className="bg-white border border-slate-100 rounded-xl p-6 hover:shadow-md hover:border-slate-200 cursor-pointer transition-all active:scale-[0.99]"
```

### Stat Card

```jsx
className="bg-white border border-slate-100 rounded-xl p-4"
// Inside:
<div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Label</div>
<div className="text-2xl font-bold text-slate-900 mt-1">Value</div>
```

---

## 9. Status Indicators

### Status Pills

```jsx
// Active / Success
className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold"

// Warning
className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold"

// Error / Danger
className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold"

// Neutral / Inactive
className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-bold"
```

---

## 10. Animations & Transitions

### Standard Transitions

| Element   | Transition                                         |
|-----------|-----------------------------------------------------|
| **Color** | `transition-colors duration-200`                    |
| **All**   | `transition-all` (buttons, cards)                   |
| **Shadow**| `transition-shadow` (cards on hover)                |
| **Modal** | `animate-in zoom-in-95 fade-in duration-200`        |

### Micro-interactions

- **Button press:** `active:scale-[0.98]`
- **Card press:** `active:scale-[0.99]`
- **Hover lift:** Use `hover:shadow-md`, not `hover:-translate-y-1` (prevents layout shift).
- **Loading:** Use `LoadingSpinner` component. Never raw text "Loading...".

### Motion Rules

- Animation duration: 150-300ms max for micro-interactions.
- Use `transform` and `opacity` only. Never animate `width`, `height`, or `margin`.
- Respect `prefers-reduced-motion` (use Tailwind's `motion-reduce:` prefix).

---

## 11. Icons

| Provider     | Usage                           |
|-------------|----------------------------------|
| **Lucide**  | All UI icons                     |
| **Size**    | `w-5 h-5` default, `w-4 h-4` small |
| **Color**   | Inherit from parent text color   |

### Icon Rules

- **No emoji icons** in UI. Emojis in text content only (🎉 in welcome messages, etc.).
- **Consistent sizing:** Don't mix `w-4` and `w-6` icons in the same row.
- **Button icons:** `w-4 h-4` inside buttons, with `gap-2`.
- **Status icons:** `w-5 h-5` in cards and list items.

---

## 12. Accessibility Checklist

Every component must pass:

- [ ] **Touch targets:** `min-h-[44px] min-w-[44px]` on buttons, links, close icons
- [ ] **Focus visible:** `focus:ring-2 focus:ring-indigo-500/20` on interactive elements
- [ ] **Color contrast:** 4.5:1 minimum for text, 3:1 for large text
- [ ] **Keyboard nav:** Escape closes modals, Tab order follows visual order
- [ ] **ARIA labels:** Icon-only buttons get `aria-label`
- [ ] **Form labels:** Every input has a visible `<label>` or `aria-label`
- [ ] **Disabled state:** `disabled:opacity-50 disabled:cursor-not-allowed`

---

## Quick Reference: Copy-Paste Snippets

### Modal with Form

```jsx
<BaseModal isOpen={isOpen} onClose={onClose} title="Edit Details" maxSize="max-w-md">
    <div className="space-y-6">
        <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 tracking-wide">Name</label>
            <input className="w-full px-4 py-3 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
        </div>
        <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 px-4 min-h-[48px] bg-white border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all active:scale-[0.98]">
                Cancel
            </button>
            <button onClick={onSave} className="flex-1 py-3 px-4 min-h-[48px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/10 transition-all active:scale-[0.98]">
                Save Changes
            </button>
        </div>
    </div>
</BaseModal>
```

### Confirmation Modal

```jsx
<ConfirmationModal
    isOpen={showDelete}
    onClose={() => setShowDelete(false)}
    onConfirm={handleDelete}
    title="Delete Booking?"
    message="This will permanently remove this booking. This action cannot be undone."
    isDanger={true}
    confirmText="Delete Booking"
/>
```

---

## Common Mistakes

| Mistake                                  | Fix                                                  |
|------------------------------------------|------------------------------------------------------|
| Using `font-black uppercase tracking-widest` on form buttons | Use `font-semibold text-sm` |
| Mixing `rounded-xl` and `rounded-2xl` on buttons | Always `rounded-xl` for buttons |
| Using `bg-blue-600` for primary actions  | Use `bg-indigo-600`                                  |
| Using `min-h-[44px]` on buttons          | Use `min-h-[48px]` for buttons, `min-h-[44px]` for inputs |
| Missing `active:scale-[0.98]` on buttons | Always include it                                    |
| Using raw `shadow-lg` without tint       | Use `shadow-lg shadow-indigo-600/10`                 |
| Text color `text-slate-400` for body     | Use `text-slate-600` minimum for readable text       |
| Hard-coded colors instead of tokens      | Use the semantic palette above                       |
