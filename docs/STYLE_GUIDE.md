# IdleVibeRPG Style Guide

## Visual Interactions

### Inventory & Grid Items

- **Hover Effects**: Avoid using `transform: scale()` or any transform that shifts layout on inventory items or grid cards.
  - _Reason_: Users find the "pulsing" effect distracting and it can cause layout jitter.
  - _Preferred_: Use `box-shadow` or `border-color` changes for hover feedback.
  - _Allowed_: Opacity changes or subtle brightness filters.

## UI Components

- **Panels**: Use consistent rounded corners (12px for main containers, 8px for inner cards).
- **Colors**: Use `rgba(255, 255, 255, 0.1)` for subtle backgrounds.
