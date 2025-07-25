// const { createDefaultPreset } = require("ts-jest");

// const tsJestTransformCfg = createDefaultPreset().transform;

// /** @type {import("jest").Config} **/
// export default {
//   testEnvironment: "node",
//   transform: {
//     ...tsJestTransformCfg,
//   },
// };


import { createDefaultPreset } from 'ts-jest';

const { transform } = createDefaultPreset();

/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  transform,
};
