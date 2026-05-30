import figma from '@figma/code-connect';
import { Button } from './button';

/**
 * FigHub-generated Code Connect stub — review props + example before merge.
 * CI: figma connect publish (after merge)
 */
figma.connect(
  Button,
  'https://www.figma.com/design/abc123/Design%20System?node-id=1-2',
  {
    props: {
      variant: figma.enum('Variant', { Default: 'default', Destructive: 'destructive' }),
      disabled: figma.boolean('Disabled'),
      label: figma.string('Label'),
    },
    example: (props) => <Button {...props} />,
  },
);
