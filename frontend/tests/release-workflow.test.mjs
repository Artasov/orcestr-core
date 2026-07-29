import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(
  new URL('../../.github/workflows/npm-release.yml', import.meta.url),
  'utf8',
);

test('npm releases are published from version tags through trusted publishing', () => {
  assert.match(workflow, /- 'core-v\*'/);
  assert.match(workflow, /- 'core-react-v\*'/);
  assert.match(workflow, /- 'core-next-v\*'/);
  assert.match(workflow, /environment: npm/);
  assert.match(workflow, /id-token: write/);
  assert.match(
    workflow,
    /name: Check package version against tag[\s\S]*?working-directory: frontend/,
  );
  assert.match(
    workflow,
    /npm publish --workspace "\$PACKAGE_NAME" --access public --provenance/,
  );
});
