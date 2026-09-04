import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getWebAuthnConfig, getChallengeStorage } from '~~/server/utils/webauthn';
import { Driver } from '~~/server/models/Driver';

export default defineEventHandler(async (event) => {
  requireAuth(event);
  const body = await readBody(event);
  if (!body.driverId) throw createError({ statusCode: 400, message: 'Driver ID is required' });

  const driver = await Driver.findById(body.driverId);
  if (!driver || !driver.fingerprint || !driver.fingerprint.registered) {
    throw createError({ statusCode: 400, message: 'Driver does not have a registered fingerprint' });
  }

  const { rpID } = getWebAuthnConfig();
  const storage = getChallengeStorage();

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: [{
      id: new Uint8Array(Buffer.from(driver.fingerprint.credentialID, 'base64url')),
      type: 'public-key',
    }],
    userVerification: 'preferred',
  });

  await storage.setItem(`auth-${driver._id}`, options.challenge);

  return { options };
});
