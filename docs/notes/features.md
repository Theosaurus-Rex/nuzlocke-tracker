# Feature notes

Reasoning too long for a code comment, linked from a one-line pointer in the source.

## combobox-field.tsx

`ComboboxField` backs both the species and move pickers. It is built on Base UI's `Autocomplete`
so the popup lives in a portal rather than a descendant of whatever scroll container the field
sits in.

`Autocomplete` owns arrow navigation, wrapping, Escape-to-close, and Enter falling through to the
form when nothing is highlighted. Selection is committed from each `Item`'s `onClick`, which Base
UI also fires for an Enter press on the highlighted item, rather than from `onValueChange`, since
that callback only ever carries the item's string label.

`open` is kept explicit rather than left uncontrolled. Base UI aria-hides everything outside the
popup and its input while the popup is open, including sibling form controls such as the dialog's
own submit button, since the input renders outside the popup. Typing a full match commits the
value without the user ever pressing Enter or clicking an option, so nothing tells Base UI to
close the list on its own in that case. Closing it ourselves once `resolve` finds a value avoids
leaving the rest of the form hidden from assistive tech.
