# Backward Selection Translate Icon

Fixed quick-translation icon placement when users select text from the end of a sentence back to the start. The old popup logic only had the full selection bounding rectangle, so ready-mode placement always used the right edge of the selection even when the drag release point was on the left.

Mouse selections now record an `actionRect` from the actual mouse-up cursor point, and the icon renders just after that point. Non-mouse selections still fall back to the selection focus edge: forward selections use the final client rect's right edge, and backward selections use the first client rect's left edge. The full translation popup still uses the whole selection rect.
