// Bağlam nesnesi ayrı dosyada durur: state.tsx geliştirme sırasında yeniden yüklense de aynı bağlam kalır.
import { createContext } from 'react';

export const StoreCtx = createContext<unknown>(null);
