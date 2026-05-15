import { TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, Activity, Zap, DollarSign, CheckCircle, Target, AlertCircle } from 'lucide-react'
interface Props { summary: any }
export default function SummaryBoxes({ summary }: Props) {
  const boxes = [
    { label:'Security Posture', value:summary.critical_cves, sub:`${summary.open_cves} open CVEs`, icon:Shield, color:summary.critical_cves>5?'var(--red)':summary.critical_cves>2?'var(--orange)':'var(--green)', trend:summary.critical_cves>5?'up':'down', trendLabel:summary.critical_cves>5?'Critical':'Improving', bg:summary.critical_cves>5?'rgba(248,81,73,0.08)':'rgba(63,185,80,0.06)' },
    { label:'Active Incidents', value:summary.active_incidents, sub:'Ongoing P0-P2', icon:Activity, color:summary.active_incidents>2?'var(--red)':summary.active_incidents>0?'var(--orange)':'var(--green)', trend:summary.active_incidents>0?'up':'neutral', trendLabel:summary.active_incidents>0?'Active now':'All clear', bg:summary.active_incidents>0?'rgba(227,179,65,0.06)':'rgba(63,185,80,0.06)' },
    { label:'System Drifts', value:summary.open_drifts, sub:`${summary.critical_drifts} critical`, icon:Zap, color:summary.critical_drifts>3?'var(--red)':'var(--yellow)', trend:summary.critical_drifts>3?'up':'neutral', trendLabel:summary.critical_drifts>3?'Needs action':'Monitor', bg:'rgba(210,153,34,0.06)' },
    { label:'Compliance Score', value:summary.compliance_avg_score.toFixed(0)+'%', sub:'SOC2 / HIPAA / GDPR', icon:CheckCircle, color:summary.compliance_avg_score>80?'var(--green)':summary.compliance_avg_score>60?'var(--yellow)':'var(--red)', trend:summary.compliance_avg_score>75?'down':'up', trendLabel:summary.compliance_avg_score>75?'On track':'At risk', bg:summary.compliance_avg_score>75?'rgba(63,185,80,0.06)':'rgba(248,81,73,0.06)' },
    { label:'Monthly Spend', value:'$'+(summary.total_monthly_cost/1000).toFixed(0)+'K', sub:(summary.cost_trend_pct>0?'+':'')+summary.cost_trend_pct.toFixed(1)+'% vs last mo', icon:DollarSign, color:summary.cost_trend_pct>10?'var(--red)':summary.cost_trend_pct>5?'var(--yellow)':'var(--green)', trend:summary.cost_trend_pct>0?'up':'down', trendLabel:(summary.cost_trend_pct>0?'+':'')+summary.cost_trend_pct.toFixed(1)+'%', bg:summary.cost_trend_pct>10?'rgba(248,81,73,0.06)':'rgba(63,185,80,0.06)' },
    { label:'Open Risks', value:summary.open_risks, sub:`${summary.critical_risks} critical`, icon:AlertTriangle, color:summary.critical_risks>2?'var(--red)':'var(--orange)', trend:summary.critical_risks>2?'up':'neutral', trendLabel:summary.critical_risks>2?'Escalated':'Managed', bg:summary.critical_risks>2?'rgba(248,81,73,0.08)':'rgba(227,179,65,0.06)' },
    { label:'Total Assets', value:summary.total_assets, sub:`${summary.critical_assets} critical status`, icon:Target, color:'var(--accent)', trend:'neutral', trendLabel:'Tracked', bg:'rgba(88,166,255,0.06)' },
    { label:'Predictive Risk', value:getPredictiveScore(summary), sub:'30-day outlook', icon:AlertCircle, color:getPredictiveColor(summary), trend:summary.critical_cves>4||summary.active_incidents>1?'up':'down', trendLabel:summary.critical_cves>4?'Deteriorating':'Stabilizing', bg:getPredictiveColor(summary)==='var(--red)'?'rgba(248,81,73,0.08)':'rgba(63,185,80,0.06)' },
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', background:'var(--border)', borderBottom:'1px solid var(--border)' }}>
      {boxes.map((box,i)=><SummaryBox key={i} {...box}/>)}
    </div>
  )
}
function SummaryBox({label,value,sub,icon:Icon,color,trend,trendLabel,bg}:any) {
  const TIcon = trend==='up'?TrendingUp:trend==='down'?TrendingDown:Minus
  const tc = trend==='up'?'var(--red)':trend==='down'?'var(--green)':'var(--text3)'
  return (
    <div style={{background:bg,padding:'14px 18px',display:'flex',flexDirection:'column',gap:5,borderRight:'1px solid var(--border)',position:'relative',overflow:'hidden',transition:'background 0.2s'}}
      onMouseEnter={e=>(e.currentTarget.style.background='var(--surface2)')}
      onMouseLeave={e=>(e.currentTarget.style.background=bg)}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <span style={{fontSize:10,color:'var(--text2)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase'}}>{label}</span>
        <Icon size={12} color={color} style={{opacity:0.7}}/>
      </div>
      <div style={{fontSize:26,fontWeight:800,color,lineHeight:1,fontFamily:'var(--font-mono)'}}>{value}</div>
      <div style={{display:'flex',alignItems:'center',gap:4}}>
        <TIcon size={10} color={tc}/>
        <span style={{fontSize:10,color:tc,fontWeight:700}}>{trendLabel}</span>
        <span style={{fontSize:10,color:'var(--text3)'}}>· {sub}</span>
      </div>
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:color,opacity:0.5}}/>
    </div>
  )
}
function getPredictiveScore(s:any){const v=100-(s.critical_cves*5+s.active_incidents*8+s.critical_drifts*3+s.critical_risks*4);return v<0?'HIGH':v<50?'MED':'LOW'}
function getPredictiveColor(s:any){const v=getPredictiveScore(s);return v==='HIGH'?'var(--red)':v==='MED'?'var(--yellow)':'var(--green)'}