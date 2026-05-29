# component-spec v1

**Name:** Button · **Framework:** react · **Category:** Form & Input · **Archetype:** chip

## Variant matrix

| Variant | Values                                                |
| ------- | ----------------------------------------------------- |
| size    | sm, default, lg, icon                                 |
| variant | default, destructive, outline, secondary, ghost, link |

## Props

| name      | type    | default | enum                                                  |
| --------- | ------- | ------- | ----------------------------------------------------- |
| asChild   | boolean | false   | —                                                     |
| className | string  |         | —                                                     |
| disabled  | boolean | false   | —                                                     |
| size      | enum    | default | sm, default, lg, icon                                 |
| type      | enum    | button  | button, submit, reset                                 |
| variant   | enum    | default | default, destructive, outline, secondary, ghost, link |

## Bindings

| selector              | variable              |
| --------------------- | --------------------- |
| root.fill             | color/primary/default |
| text/label.text-style | Label/MD              |

## Layout

| Property          | Value      |
| ----------------- | ---------- |
| direction         | horizontal |
| gap               | space/md   |
| padding           | space/md   |
| horizontal sizing | hug        |
| vertical sizing   | hug        |

## Unresolved

- trailing icon slot
