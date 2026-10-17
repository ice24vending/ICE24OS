export type Role = 'Propietario' | 'Administrador de sucursal' | 'Técnico' | 'Solo lectura' | 'Operador ICE24';
export type DemoState = 'Normal' | 'Cargando' | 'Vacío' | 'Error de servicio' | 'Sin conexión' | 'Sin permiso';
export const roles: Role[] = ['Propietario','Administrador de sucursal','Técnico','Solo lectura','Operador ICE24'];
export const demoStates: DemoState[] = ['Normal','Cargando','Vacío','Error de servicio','Sin conexión','Sin permiso'];
export const syncStates = ['Disponible offline','Guardado localmente','Pendiente de sincronizar','Sincronizando','Sincronizado','Error reintentable','Conflicto'];
export const branches = [
 {id:'sucursal-01',name:'Monterrey Centro',address:'Av. Madero 1450, Centro, Monterrey, N.L.',manager:'Mariana López',machines:8},
 {id:'sucursal-02',name:'San Nicolás',address:'Av. Universidad 820, San Nicolás de los Garza, N.L.',manager:'Roberto Garza',machines:6},
 {id:'sucursal-03',name:'Apodaca',address:'Av. Miguel Alemán 320, Apodaca, N.L.',manager:'Laura Treviño',machines:4},
];
export const machines = [
 {id:'ICE24-000145',model:'ICE24 Pro 500',branch:'Monterrey Centro',operation:'Fuera de servicio',technical:'Crítico',sanitary:'Al día',tech:'Carlos Méndez'},
 {id:'ICE24-000146',model:'ICE24 Pro 500',branch:'Monterrey Centro',operation:'Disponible',technical:'Óptimo',sanitary:'Al día',tech:'Carlos Méndez'},
 {id:'ICE24-000147',model:'ICE24 Compact 250',branch:'San Nicolás',operation:'Disponible',technical:'Atención preventiva',sanitary:'Próximo a vencer',tech:'Ana Ruiz'},
 {id:'ICE24-000148',model:'ICE24 Pro 500',branch:'Apodaca',operation:'En mantenimiento',technical:'Atención requerida',sanitary:'Al día',tech:'Carlos Méndez'},
 {id:'ICE24-000149',model:'ICE24 Compact 250',branch:'San Nicolás',operation:'Apagada',technical:'Óptimo',sanitary:'Atención requerida',tech:'Ana Ruiz'},
 {id:'ICE24-000150',model:'ICE24 Pro 500',branch:'Apodaca',operation:'Disponible',technical:'Óptimo',sanitary:'Al día',tech:'Ana Ruiz'},
];
export const tasks = [
 {id:'OT-00241',title:'Revisar compresor de refrigeración',machine:'ICE24-000145',branch:'Monterrey Centro',time:'09:00',status:'Urgente',person:'Carlos Méndez'},
 {id:'OT-00242',title:'Mantenimiento preventivo',machine:'ICE24-000147',branch:'San Nicolás',time:'11:30',status:'Hoy',person:'Ana Ruiz'},
 {id:'CS-00108',title:'Renovar control sanitario',machine:'ICE24-000149',branch:'San Nicolás',time:'14:00',status:'Vencido',person:'Laura Treviño'},
 {id:'OT-00243',title:'Cambio de filtro de agua',machine:'ICE24-000148',branch:'Apodaca',time:'16:00',status:'Mañana',person:'Carlos Méndez'},
];
export const events = [
 {title:'Mantenimiento preventivo completado',detail:'Carlos Méndez · ICE24-000146',time:'Hoy, 08:42',date:'15/10/2026',reason:'Limpieza de condensador y revisión de presión.'},
 {title:'Control sanitario registrado',detail:'Ana Ruiz · San Nicolás',time:'Hoy, 08:15',date:'15/10/2026',reason:'Muestra de agua dentro de los parámetros permitidos.'},
 {title:'Documento actualizado',detail:'Mariana López · Monterrey Centro',time:'Ayer, 17:30',date:'14/10/2026',reason:'Se adjuntó certificado de laboratorio vigente.'},
];
export function tone(status:string): 'success'|'warning'|'danger'|'info'|'neutral'|'audit'|'offline' {
 if(['Disponible','Óptimo','Al día','Resuelta','Sincronizado','Activa','Completada'].includes(status)) return 'success';
 if(['Crítico','Fuera de servicio','Acción correctiva','Restringido','Urgente','Vencido','Suspendida'].includes(status)) return 'danger';
 if(['Atención preventiva','Próximo a vencer','Atención requerida','Hoy','Pendiente','Enterado'].includes(status)) return 'warning';
 if(['En mantenimiento','En atención','No leída','Mañana'].includes(status)) return 'info';
 return 'neutral';
}
