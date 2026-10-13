import { ReactNode } from 'react';
/** Community, Jobs, Pricing and About use the light surface from the design mockup. */
export default function Light({ children }: { children: ReactNode }) { return <div className="light light-surface"><div className="wrap section">{children}</div></div>; }
