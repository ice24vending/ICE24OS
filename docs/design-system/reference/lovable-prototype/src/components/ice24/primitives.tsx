import { Activity, Wrench, ShieldCheck, CheckCircle2, AlertTriangle, Info, WifiOff, Loader2, PackageOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { tone } from '@/data/ice24';
export function Status({value,dimension}:{value:string;dimension?:'operation'|'technical'|'sanitary'}) {
 const Icon = dimension==='operation'?Activity:dimension==='technical'?Wrench:dimension==='sanitary'?ShieldCheck:tone(value)==='success'?CheckCircle2:tone(value)==='danger'||tone(value)==='warning'?AlertTriangle:Info;
 return <span className={`tag tag-${tone(value)}`}><Icon size={12}/>{value}</span>;
}
export function Banner({kind='info',children}:{kind?:string;children:ReactNode}) {const Icon=kind==='offline'?WifiOff:kind==='danger'||kind==='warning'?AlertTriangle:kind==='success'?CheckCircle2:Info;return <div className={`banner banner-${kind}`} role={kind==='danger'?'alert':'status'}><Icon size={20}/><div className="flex-1">{children}</div></div>}
export function Sync({state='Sincronizado'}:{state?:string}) {const Icon=state==='Sincronizando'?Loader2:state==='Error reintentable'||state==='Conflicto'?AlertTriangle:state==='Disponible offline'?WifiOff:CheckCircle2;return <span className={`sync ${state==='Conflicto'||state==='Error reintentable'?'text-danger':''}`} title={state}><Icon size={15} className={state==='Sincronizando'?'animate-spin':''}/><span>{state}</span></span>}
export function Empty({title='Todavía no hay registros',description='Los nuevos registros aparecerán aquí.',action,onAction}:{title?:string;description?:string;action?:string;onAction?:()=>void}) {return <div className="panel empty-state"><PackageOpen/><h2>{title}</h2><p>{description}</p>{action&&<Button onClick={onAction}>{action}</Button>}</div>}
export function Loading(){return <div aria-label="Cargando información" role="status"><div className="kpi-grid">{[1,2,3,4].map(i=><div key={i} className="panel kpi"><div className="skeleton h-4 w-28"/><div className="skeleton h-10 w-16 mt-4"/><div className="skeleton h-3 w-32 mt-3"/></div>)}</div><div className="panel section-gap">{[1,2,3,4].map(i=><div key={i} className="skeleton skeleton-row"/>)}</div></div>}
export function Field({label,children}:{label:string;children:ReactNode}){return <label className="block text-small font-semibold"><span className="block mb-2">{label}</span>{children}</label>}
export function PanelTitle({title,children}:{title:string;children?:ReactNode}){return <div className="panel-head"><h2>{title}</h2>{children}</div>}
