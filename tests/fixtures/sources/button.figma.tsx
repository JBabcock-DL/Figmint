import figma from '@figma/code-connect';
import { Button } from './button';

figma.connect(Button, 'https://www.figma.com/design/example/Button', {
  props: {
    variant: figma.enum('Variant', {
      Primary: 'default',
      Destructive: 'destructive',
      Outline: 'outline',
      Secondary: 'secondary',
      Ghost: 'ghost',
      Link: 'link',
    }),
    disabled: figma.boolean('Disabled'),
  },
  example: (props) => <Button {...props} />,
});
