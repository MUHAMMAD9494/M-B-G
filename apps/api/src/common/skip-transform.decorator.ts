import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_KEY = 'skipTransform';

/** Marks a handler whose response should not be wrapped by the transform interceptor. */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
