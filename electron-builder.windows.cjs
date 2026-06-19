const packageJson = require("./package.json");

const baseConfig = packageJson.build;

const requiredAzureEnv = [
  "AZURE_TENANT_ID",
  "AZURE_CLIENT_ID",
  "AZURE_CLIENT_SECRET",
  "AZURE_CODESIGNING_ENDPOINT",
  "AZURE_CODESIGNING_ACCOUNT_NAME",
  "AZURE_CODESIGNING_PROFILE_NAME",
  "AZURE_CODESIGNING_PUBLISHER_NAME",
];

const hasAzureSigning = requiredAzureEnv.every((name) => Boolean(process.env[name]));

module.exports = {
  ...baseConfig,
  toolsets: {
    ...baseConfig.toolsets,
    // Use the newer Windows signing toolset instead of the legacy
    // Invoke-TrustedSigning PowerShell fallback, which is brittle in CI.
    winCodeSign: "1.1.0",
  },
  win: {
    ...baseConfig.win,
    ...(hasAzureSigning
      ? {
          azureSignOptions: {
            endpoint: process.env.AZURE_CODESIGNING_ENDPOINT,
            codeSigningAccountName: process.env.AZURE_CODESIGNING_ACCOUNT_NAME,
            certificateProfileName: process.env.AZURE_CODESIGNING_PROFILE_NAME,
            publisherName: process.env.AZURE_CODESIGNING_PUBLISHER_NAME,
          },
        }
      : {}),
  },
};
