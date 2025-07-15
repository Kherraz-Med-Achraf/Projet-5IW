import * as fs from 'fs';

/**
 * Reads a secret value.
 * 1. If the corresponding environment variable exists and is non-empty, it is returned.
 * 2. Otherwise the value is read from the Docker Swarm/K8s secret file at `filePath`.
 *
 * @param filePath Absolute path to the secret file (e.g. /run/secrets/access_token_secret)
 * @param envVar   Name of the environment variable to look for first
 * @returns The secret value as a string
 * @throws  If neither the env var nor the file provide a value
 */
export function readSecret(filePath: string, envVar: string): string {
  const envValue = process.env[envVar];
  if (envValue && envValue.length > 0) {
    return envValue;
  }

  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch (err) {
    throw new Error(
      `Unable to read secret '${envVar}'. Checked env var and file path '${filePath}'.`,
    );
  }
}
