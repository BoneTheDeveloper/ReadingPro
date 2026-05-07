import { createModuleLogger } from '@/lib/core/logger';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';

const log = createModuleLogger('actions:study-shared');

export { getAuthenticatedUser };
