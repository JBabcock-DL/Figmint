import { buildFigmaNodeUrl } from '../buildFigmaNodeUrl';
import { mapFigmaPropsToCodeConnect } from '../mapFigmaPropsToCodeConnect';
import { resolveStubPath } from '../resolveStubPath';
import type { MappingTemplate, MappingTemplateContext, MappingStubFile } from '../types';

function toPascalCase(name: string): string {
  const parts = name.split(/[\s_\-/]+/);
  let result = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.length === 0) {
      continue;
    }
    result = result + part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }
  if (result.length === 0) {
    return name;
  }
  return result;
}

export class ReactMappingTemplate implements MappingTemplate {
  readonly framework = 'react' as const;

  generateStub(ctx: MappingTemplateContext): MappingStubFile {
    const component = ctx.component;
    const componentName = toPascalCase(component.name);
    const paths = resolveStubPath({
      specsPath: ctx.repoComponentsRoot,
      componentKey: component.componentKey,
      componentName: component.name,
    });

    let fileSlug = 'file';
    if (ctx.figmaFileSlug !== undefined && ctx.figmaFileSlug.length > 0) {
      fileSlug = ctx.figmaFileSlug;
    }

    const nodeUrl = buildFigmaNodeUrl({
      fileKey: component.fileKey,
      fileSlug: fileSlug,
      nodeId: component.nodeId,
    });

    const mappedProps = mapFigmaPropsToCodeConnect(component.componentProperties);
    const importPath =
      ctx.implementationImportPath.length > 0
        ? ctx.implementationImportPath
        : paths.implementationImportPath;

    const propsBlock =
      mappedProps.propLines.length > 0
        ? mappedProps.propLines.join('\n')
        : '      // No component properties detected';

    const content =
      "import figma from '@figma/code-connect';\n" +
      'import { ' +
      componentName +
      ' } from \'' +
      importPath +
      "';\n\n" +
      '/**\n' +
      ' * FigHub-generated Code Connect stub — review props + example before merge.\n' +
      ' * CI: figma connect publish (after merge)\n' +
      ' */\n' +
      'figma.connect(\n' +
      '  ' +
      componentName +
      ',\n' +
      "  '" +
      nodeUrl +
      "',\n" +
      '  {\n' +
      '    props: {\n' +
      propsBlock +
      '\n' +
      '    },\n' +
      '    example: (props) => <' +
      componentName +
      ' {...props} />,\n' +
      '  },\n' +
      ');\n';

    console.debug('[codeconnect] generateStub', {
      componentKey: component.componentKey,
      relativePath: paths.relativePath,
    });

    return {
      relativePath: paths.relativePath,
      content: content,
    };
  }
}
