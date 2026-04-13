"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import type { WeatherData } from "@/lib/mock-data";

const GRID = "hsl(220 16% 16% / 0.8)";
const TICK = "hsl(215 18% 38%)";
const TT = { backgroundColor:"hsl(222 22% 8%)",border:"1px solid hsl(220 16% 18%)",borderRadius:"8px",fontSize:"12px",fontFamily:"monospace" };

function Card({title,sub,children}:{title:string;sub:string;children:React.ReactNode}) {
  return <div className="rounded-xl border border-border/60 bg-card p-4"><div className="mb-4"><h3 className="text-[13px] font-semibold">{title}</h3><p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p></div>{children}</div>;
}

export function WindChart({data,airport}:{data:WeatherData[];airport:string}) {
  const d = data.map(w=>({hour:new Date(w.hour).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",timeZone:"UTC"}),wind:Math.round(w.wind),gusts:Math.round(w.gusts)}));
  return <Card title="EvoluciÃ³n del Viento" sub={`${airport} Â· PrÃ³ximas 24h`}>
    <div className="h-[200px]"><ResponsiveContainer width="100%" height="100%">
      <AreaChart data={d} margin={{top:8,right:8,left:-8,bottom:0}}>
        <defs>
          <linearGradient id="wf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(210 100% 60%)" stopOpacity={0.25}/><stop offset="95%" stopColor="hsl(210 100% 60%)" stopOpacity={0.02}/></linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false}/>
        <XAxis dataKey="hour" tick={{fontSize:10,fill:TICK}} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
        <YAxis tick={{fontSize:10,fill:TICK}} tickLine={false} axisLine={false} unit=" kts" width={44}/>
        <Tooltip contentStyle={TT} labelStyle={{color:"hsl(214 32% 70%)"}} cursor={{stroke:"hsl(210 100% 60% / 0.2)",strokeWidth:1}}/>
        <Area type="monotone" dataKey="gusts" stroke="hsl(0 84% 60%)" strokeWidth={1.5} strokeDasharray="5 3" fill="transparent" name="RÃ¡fagas" dot={false}/>
        <Area type="monotone" dataKey="wind" stroke="hsl(210 100% 60%)" strokeWidth={2} fill="url(#wf)" name="Viento" dot={false}/>
      </AreaChart>
    </ResponsiveContainer></div>
    <div className="flex items-center justify-center gap-6 mt-2 text-[11px] text-muted-foreground/60">
      <span className="flex items-center gap-1.5"><span className="inline-block h-[2px] w-5 rounded" style={{background:"hsl(210 100% 60%)"}}/>Viento</span>
      <span className="flex items-center gap-1.5"><span className="inline-block h-[2px] w-5" style={{borderTop:"1px dashed hsl(0 84% 60%)",height:0}}/>RÃ¡fagas</span>
    </div>
  </Card>;
}

export function PrecipChart({data,airport}:{data:WeatherData[];airport:string}) {
  const d = data.map(w=>({hour:new Date(w.hour).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",timeZone:"UTC"}),precip:Math.round(w.precip*10)/10}));
  return <Card title="Precipitaciones Esperadas" sub={`${airport} Â· PrÃ³ximas 24h`}>
    <div className="h-[200px]"><ResponsiveContainer width="100%" height="100%">
      <BarChart data={d} margin={{top:8,right:8,left:-8,bottom:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false}/>
        <XAxis dataKey="hour" tick={{fontSize:10,fill:TICK}} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
        <YAxis tick={{fontSize:10,fill:TICK}} tickLine={false} axisLine={false} unit=" mm" width={44}/>
        <Tooltip contentStyle={TT} labelStyle={{color:"hsl(214 32% 70%)"}} cursor={{fill:"hsl(210 100% 60% / 0.05)"}}/>
        <Bar dataKey="precip" radius={[3,3,0,0]} name="Lluvia (mm)">
          {d.map((e,i)=><Cell key={i} fill={e.precip>2?"hsl(210 100% 55%)":e.precip>0.5?"hsl(210 100% 50% / 0.75)":"hsl(210 100% 45% / 0.4)"}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer></div>
  </Card>;
}

export function AirlineDistributionChart({data,airport,hours}:{data:{airline:string;flights:number}[];airport:string;hours:number}) {
  const max = Math.max(...data.map(d=>d.flights),0);
  return <Card title="DistribuciÃ³n de AerolÃ­neas" sub={`${airport} Â· PrÃ³ximas ${hours}h`}>
    <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.slice(0,8)} layout="vertical" margin={{top:0,right:16,left:0,bottom:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false}/>
        <XAxis type="number" tick={{fontSize:10,fill:TICK}} tickLine={false} axisLine={false}/>
        <YAxis type="category" dataKey="airline" tick={{fontSize:11,fill:TICK}} tickLine={false} axisLine={false} width={110} tickFormatter={v=>v.replace(" Airlines","").replace(" Airways","")}/>
        <Tooltip contentStyle={TT} labelStyle={{color:"hsl(214 32% 70%)"}} cursor={{fill:"hsl(142 71% 45% / 0.05)"}}/>
        <Bar dataKey="flights" radius={[0,4,4,0]} name="Vuelos">
          {data.slice(0,8).map((e,i)=><Cell key={i} fill={e.flights===max?"hsl(142 71% 45%)":`hsl(142 71% 45% / ${0.7-i*0.07})`}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer></div>
  </Card>;
}

export function HourlyLoadChart({data,airport,hours}:{data:{hour:string;flights:number}[];airport:string;hours:number}) {
  const max = Math.max(...data.map(d=>d.flights),0);
  const avg = data.length ? Math.round(data.reduce((s,d)=>s+d.flights,0)/data.length) : 0;
  return <Card title="Carga Operativa por Hora" sub={`${airport} Â· PrÃ³ximas ${hours}h`}>
    <div className="h-[200px]"><ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{top:8,right:8,left:-8,bottom:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false}/>
        <XAxis dataKey="hour" tick={{fontSize:10,fill:TICK}} tickLine={false} axisLine={false} interval={Math.ceil(data.length/8)}/>
        <YAxis tick={{fontSize:10,fill:TICK}} tickLine={false} axisLine={false} width={28}/>
        <Tooltip contentStyle={TT} labelStyle={{color:"hsl(214 32% 70%)"}} cursor={{fill:"hsl(38 92% 55% / 0.06)"}}/>
        <Bar dataKey="flights" radius={[3,3,0,0]} name="Vuelos">
          {data.map((e,i)=><Cell key={i} fill={e.flights===max?"hsl(0 84% 60%)":e.flights>avg?"hsl(38 92% 55%)":"hsl(38 92% 55% / 0.6)"}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer></div>
  </Card>;
}
