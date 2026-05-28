# component-spec v1

**Name:** Button · **Framework:** react · **Category:** Form & Input · **Archetype:** control

## Variant matrix

| Variant | Values |
| --- | --- |
| size | sm, md, lg |
| variant | primary, secondary, ghost |

## Props

| name | type | default | enum |
| --- | --- | --- | --- |
| disabled | boolean | false | — |
| size | enum | md | sm, md, lg |
| variant | enum | primary | primary, secondary, ghost |

## Bindings

| selector | variable |
| --- | --- |
| .button | Theme/color/primary/default |
| .button-label | Typography/Label/MD/font-size |

## Layout

| Property | Value |
| --- | --- |
| direction | horizontal |
| gap | Layout/spacing/2 |
| padding | Layout/spacing/3 |
| horizontal sizing | hug |
| vertical sizing | hug |

## Unresolved

- trailing icon slot
