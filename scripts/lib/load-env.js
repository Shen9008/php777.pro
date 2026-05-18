'use strict';

const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '../..');

/* Base defaults … */
dotenv.config({ path: path.join(ROOT, '.env') });
/* … then machine-specific overrides (preferred for secrets; gitignored) */
dotenv.config({ path: path.join(ROOT, '.env.local'), override: true });

module.exports = { ROOT };
