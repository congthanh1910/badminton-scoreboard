import { useContext } from 'react';
import { isNull } from 'lodash';
import { Nullable } from '@/utils/types';

export function makeUseContext<T>(context: React.Context<Nullable<T>>, name: string) {
  return function () {
    const ctx = useContext(context);
    if (isNull(ctx)) {
      throw new Error(`${name} must be used within a ${name}.Provider`);
    }
    return ctx;
  };
}
