# Feature notes

Reasoning too long for a code comment, linked from a one-line pointer in the source.

## combobox-field.tsx

`ComboboxField` backs the species, move, ability and held item pickers. It is built on Base UI's `Autocomplete`
so the popup lives in a portal rather than a descendant of whatever scroll container the field
sits in.

`Autocomplete` owns arrow navigation, wrapping, Escape-to-close, and Enter falling through to the
form when nothing is highlighted. Selection is committed from each `Item`'s `onClick`, which Base
UI also fires for an Enter press on the highlighted item, rather than from `onValueChange`, since
that callback only ever carries the item's string label.

Typing only filters. Nothing is chosen mid-typing, so "Acid" cannot beat "Acid Spray". A value is
set by picking a row, or by blur: leaving the field with text that `resolve` matches exactly
commits it, so a form saved straight after typing a full name keeps the value. Editing the text of
a field that holds a value clears it. A mouse click on a row does not blur the input first, so
blur never double-commits a click.

`open` is kept explicit rather than left uncontrolled so that the popup closes after a pick.
Base UI aria-hides everything outside the popup and its input while it is open, including the
dialog's own submit button.
