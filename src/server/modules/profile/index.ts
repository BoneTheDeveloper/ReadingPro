// The profile module's public API. Other modules import from here, never from its files.
export {
  findProfileSettings,
  insertProfileIfMissing,
  lockProfile,
  type ProfileSettings,
} from "./profile-repository";
