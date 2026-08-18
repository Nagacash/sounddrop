import assert from 'node:assert/strict';
import {
  isCompactJwt,
  isNewSupabaseApiKey,
  supabaseHeaders,
  unwrapEnvSecret,
} from './utils/supabase/apiKey.ts';

const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig';
const secret = 'sb_secret_examplekeyvalue';

{
  const headers = supabaseHeaders(secret, { Authorization: `Bearer ${secret}` });
  assert.equal(headers.get('apikey'), secret);
  assert.equal(headers.get('Authorization'), null);
}

{
  const headers = supabaseHeaders(jwt);
  assert.equal(headers.get('apikey'), jwt);
  assert.equal(headers.get('Authorization'), `Bearer ${jwt}`);
}

{
  const headers = supabaseHeaders(secret, { Authorization: 'Bearer not-a-jwt' });
  assert.equal(headers.get('Authorization'), null);
  assert.equal(headers.get('apikey'), secret);
}

assert.equal(unwrapEnvSecret('"sb_secret_abc"'), 'sb_secret_abc');
assert.equal(isNewSupabaseApiKey(secret), true);
assert.equal(isCompactJwt(jwt), true);
assert.equal(isCompactJwt(secret), false);

console.log('PASS supabase apiKey header rules');
