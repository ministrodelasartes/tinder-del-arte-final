import { useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence, animate } from 'framer-motion'

const DEFAULT_ARTWORKS = [
  { id: 'monalisa', title: 'La Gioconda (Mona Lisa)', author: 'Leonardo da Vinci', year: 1506, img: 'https://picsum.photos/seed/monalisa/1200/900' },
  { id: 'birthofvenus', title: 'El nacimiento de Venus', author: 'Sandro Botticelli', year: 1486, img: 'https://picsum.photos/seed/birthofvenus/1200/900' },
  { id: 'nightwatch', title: 'La Ronda de Noche', author: 'Rembrandt', year: 1642, img: 'https://picsum.photos/seed/nightwatch/1200/900' },
  { id: 'girlpearl', title: 'La joven de la perla', author: 'Johannes Vermeer', year: 1665, img: 'https://picsum.photos/seed/girlpearl/1200/900' },
  { id: 'starrynight', title: 'La noche estrellada', author: 'Vincent van Gogh', year: 1889, img: 'https://picsum.photos/seed/starrynight/1200/900' },
  { id: 'scream', title: 'El grito', author: 'Edvard Munch', year: 1893, img: 'https://picsum.photos/seed/scream/1200/900' },
  { id: 'americangothic', title: 'American Gothic', author: 'Grant Wood', year: 1930, img: 'https://picsum.photos/seed/americangothic/1200/900' },
  { id: 'persistence', title: 'La persistencia de la memoria', author: 'Salvador Dalí', year: 1931, img: 'https://picsum.photos/seed/persistence/1200/900' },
  { id: 'guernica', title: 'Guernica', author: 'Pablo Picasso', year: 1937, img: 'https://picsum.photos/seed/guernica/1200/900' },
  { id: 'kiss', title: 'El beso', author: 'Gustav Klimt', year: 1908, img: 'https://picsum.photos/seed/kiss/1200/900' },
]

function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]} return a }

export default function ArtSwipeGame(){
  const [artworks,setArtworks]=useState(DEFAULT_ARTWORKS)
  const [deck,setDeck]=useState(()=>shuffle(artworks))
  const [index,setIndex]=useState(1)
  const [score,setScore]=useState(0)
  const [tries,setTries]=useState(0)
  const [finished,setFinished]=useState(false)
  const [outOfLives,setOutOfLives]=useState(false)
  const [feedback,setFeedback]=useState(null) // 'correct' | 'wrong' | null
  const [reveal,setReveal]=useState(false)
  const [lives,setLives]=useState(3)
  const [loadMsg,setLoadMsg]=useState('')

  const current = deck[index]
  const previous = deck[index-1]

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-180,0,180], [-12,0,12])
  const opacityBefore = useTransform(x, [-80,0], [1,0])
  const opacityAfter  = useTransform(x, [0,80], [0,1])
  const threshold=80, SWIPE_PEAK=110
  const SWIPE_OUT={type:'tween',duration:0.12,ease:'easeOut'}
  const SWIPE_BACK={type:'tween',duration:0.18,ease:'easeOut'}

  useEffect(()=>{(async()=>{
    try{
      const res=await fetch(`/obras.json?ts=${Date.now()}`,{cache:'no-store'})
      if(!res.ok) throw new Error('no-json')
      const json=await res.json()
      if(!Array.isArray(json)) throw new Error('bad-format')
      const clean=json
        .filter(o=>o&&o.id&&o.title&&o.author&&(o.year!==undefined&&o.year!==null)&&Number.isFinite(+o.year))
        .map(o=>({...o,year:+o.year,img:(o.img&&String(o.img).trim().length>0)?String(o.img).trim():`https://picsum.photos/seed/${encodeURIComponent(o.id)}/1200/900`}))
      if(clean.length>=2){
        setArtworks(clean); setDeck(shuffle(clean)); setIndex(1); setScore(0); setTries(0); setFinished(false); setOutOfLives(false); setFeedback(null); setReveal(false); setLives(3); x.set(0); setLoadMsg('')
      }else{
        setLoadMsg('Usando obras internas (no se encontró /obras.json válido)')
      }
    }catch{
      setLoadMsg('Usando obras internas (no se encontró /obras.json)')
    }
  })()},[])

  useEffect(()=>{ const next=deck[index+1]; if(next){ const img=new Image(); img.src=next.img } },[index,deck])

  useEffect(()=>{
    function onKey(e){
      if(finished||feedback||!current||!previous) return
      if(e.key==='ArrowLeft'){ e.preventDefault(); triggerDecision('before') }
      else if(e.key==='ArrowRight'){ e.preventDefault(); triggerDecision('after') }
    }
    window.addEventListener('keydown',onKey); return ()=>window.removeEventListener('keydown',onKey)
  },[finished,feedback,current,previous])

  function vibrate(p){ try{ if(navigator.vibrate) navigator.vibrate(p) }catch{} }

  function restart(){
    setDeck(shuffle(artworks)); setIndex(1); setScore(0); setTries(0); setFinished(false); setOutOfLives(false); setFeedback(null); setReveal(false); setLives(3); x.set(0)
  }

  function decide(direction){
    if(!current||!previous||finished||feedback) return
    const isAfter=current.year>previous.year
    const correct=(direction==='after'&&isAfter)||(direction==='before'&&!isAfter)
    setFeedback(correct?'correct':'wrong'); setReveal(true); vibrate(correct?30:[20,30,40])
    setTimeout(()=>{
      setFeedback(null); setTries(t=>t+1); if(correct) setScore(s=>s+1); else setLives(v=>Math.max(0,v-1))
      const willHaveLives = correct ? lives : Math.max(0,lives-1)
      const outLives = willHaveLives<=0
      const endOfDeck = index>=deck.length-1
      if(outLives||endOfDeck){ setFinished(true); setOutOfLives(outLives) }
      else { setIndex(i=>i+1); x.set(0); setReveal(false) }
    },2000) // 2s para leer feedback
  }

  async function triggerDecision(dir){ if(finished||feedback) return; const peak=dir==='after'?SWIPE_PEAK:-SWIPE_PEAK; await animate(x,peak,SWIPE_OUT); await animate(x,0,SWIPE_BACK); decide(dir) }
  function handleDragEnd(_,info){ if(finished||feedback) return; const dx=info.offset.x; if(dx>threshold) triggerDecision('after'); else if(dx<-threshold) triggerDecision('before'); else animate(x,0,SWIPE_BACK) }

  const heart = (filled)=>(<svg aria-hidden='true' viewBox='0 0 24 24' className={`h-5 w-5 ${filled?'fill-rose-500':'fill-transparent'} stroke-rose-500`}><path strokeWidth='1.8' d='M12.1 21S4 13.9 4 8.9A4.9 4.9 0 0 1 8.9 4c1.6 0 2.9.7 3.7 1.8A4.7 4.7 0 0 1 16.3 4 4.9 4.9 0 0 1 21.2 8.9c0 5-8 12.1-9.1 12.1Z'/></svg>)

  if(deck.length<2){ return <div className='min-h-screen flex items-center justify-center'><p className='text-lg'>Cargando…</p></div> }

  const perfect = finished && !outOfLives && score === deck.length - 1

  return (
    <div className='min-h-screen w-full bg-neutral-100 text-neutral-900 flex flex-col items-center p-4 sm:p-6'>
      <div className='w-full max-w-md relative'>
        <div className='flex items-center justify-between mb-3'>
          <div className='text-sm font-medium opacity-70'>Referencia anterior</div>
          <div className='flex items-center gap-2'>
            <div className='flex items-center gap-0.5' aria-label={`Vidas: ${lives}`} role='status'>
              {heart(lives>=1)}{heart(lives>=2)}{heart(lives>=3)}
            </div>
            <button onClick={restart} className='text-sm underline opacity-70'>Reiniciar</button>
          </div>
        </div>

        {loadMsg && <div className='mb-2 text-[10px] opacity-60'>{loadMsg}</div>}

        <div className='w-full h-14 bg-white rounded-xl shadow-sm border flex items-center px-2 overflow-hidden'>
          {previous ? (
            <div className='flex items-center gap-2 truncate'>
              <img src={previous.img} alt='Obra anterior' className='h-10 w-10 object-cover rounded-md flex-none'
                onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src=`https://picsum.photos/seed/${encodeURIComponent(previous?.id||'prev')}/200/200`; }} />
              <div className='truncate text-xs leading-tight'>
                <div className='font-semibold truncate'>{previous.title}</div>
                <div className='opacity-70 truncate'>{previous.author}</div>
              </div>
            </div>
          ) : <div className='text-xs opacity-60'>Sin referencia</div>}
        </div>

        <div className='mt-4 relative h-[62vh] max-h-[720px] select-none'>
          {(!finished && !feedback) && (<>
            <motion.div style={{opacity:opacityBefore}} className='absolute left-3 top-3 z-10 text-xs px-2 py-1 rounded-full border bg-white/80 backdrop-blur'>Antes</motion.div>
            <motion.div style={{opacity:opacityAfter}}  className='absolute right-3 top-3 z-10 text-xs px-2 py-1 rounded-full border bg-white/80 backdrop-blur'>Después</motion.div>
          </>)}

          <AnimatePresence initial={false}>
            {current && (
              <motion.div
                key={current.id}
                className='absolute inset-0 bg-white rounded-2xl shadow-xl border flex flex-col overflow-hidden'
                drag={finished || feedback ? false : 'x'}
                aria-label='Carta de obra actual'
                role='group'
                style={{ x, rotate, touchAction: 'pan-y' }}
                dragElastic={0.3}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={finished || feedback ? undefined : handleDragEnd}
                whileDrag={{ scale: 1.03, boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              >
                <div className={`flex-1 relative bg-neutral-50 ${feedback ? 'opacity-0' : 'opacity-100'}`}>
                  <img src={current.img} alt={current.title} className='absolute inset-0 h-full w-full object-contain p-4' draggable={false}
                    onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src=`https://picsum.photos/seed/${encodeURIComponent(current?.id||'obra')}/1200/900`; }} />
                </div>
                <div className={`p-4 border-t bg-white ${feedback ? 'opacity-0' : 'opacity-100'}`}>
                  <div className='text-lg font-semibold leading-snug'>{current.title}</div>
                  <div className='text-sm opacity-70'>{current.author}</div>
                </div>

                <AnimatePresence>
                  {reveal && !feedback && (
                    <motion.div
                      key='reveal-chip'
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className='pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full bg-black text-white shadow flex items-center justify-center whitespace-nowrap font-medium [font-variant-numeric:tabular-nums]'
                    >
                      {previous && `${previous.year}`} → {current.year}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {feedback && (
                    <motion.div
                      key='fb-full'
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`absolute inset-0 rounded-2xl ${feedback==='correct'?'bg-emerald-500':'bg-rose-500'} text-white flex flex-col items-center justify-center gap-2 p-6`}
                    >
                      <div className='text-2xl font-bold'>{feedback==='correct'?'¡Correcto!':'Incorrecto'}</div>
                      <div className='text-sm opacity-95 [font-variant-numeric:tabular-nums]'>
                        {previous && `${previous.year}`} → {current.year}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <button aria-label='Elegir ANTES' disabled={finished||feedback} onClick={()=>!(finished||feedback)&&triggerDecision('before')}
            className={`absolute left-0 top-0 h-full w-1/4 z-20 ${finished||feedback?'pointer-events-none':'bg-gradient-to-r from-transparent to-transparent hover:from-black/5 active:from-black/10'}`}/>
          <button aria-label='Elegir DESPUÉS' disabled={finished||feedback} onClick={()=>!(finished||feedback)&&triggerDecision('after')}
            className={`absolute right-0 top-0 h-full w-1/4 z-20 ${finished||feedback?'pointer-events-none':'bg-gradient-to-l from-transparent to-transparent hover:from-black/5 active:from-black/10'}`}/>

          <AnimatePresence>
            {finished && (
              <motion.div
                key='finished'
                className={`absolute inset-0 rounded-2xl shadow-xl border flex flex-col items-center justify-center p-6 text-center ${outOfLives ? 'bg-rose-600 border-rose-700' : 'bg-emerald-600 border-emerald-700'}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <div className='text-3xl font-extrabold tracking-wide text-white mb-3'>
                  {(!outOfLives && score === deck.length - 1) ? '¡FELICIDADES!' : 'FIN DEL JUEGO'}
                </div>
                {(!outOfLives && score === deck.length - 1) && (
                  <div className='text-xs sm:text-sm text-white/95 max-w-sm mb-4'>
                    Has llegado al final. Ni yo (@ministrodelasartes) he logrado ver esta pantalla jaja (sólo la escribí en el código). Envíame un pantallazo y seré muy feliz :)
                  </div>
                )}
                <div className='text-white/95 mb-6'>Puntaje: {score} / {deck.length - 1}</div>
                <button onClick={restart} className='px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition'>Jugar de nuevo</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className='mt-3 flex items-center justify-between text-sm'>
          <div><span className='font-semibold'>Puntaje:</span> {score}</div>
          <div><span className='font-semibold'>Progreso:</span> {Math.min(index, deck.length - 1)} / {deck.length - 1}</div>
        </div>

        <p className='mt-2 text-[11px] opacity-60 leading-relaxed text-center'>
          Desliza a la <span className='font-semibold'>izquierda</span> si la obra actual es <span className='font-semibold'>anterior</span> a la referencia, y a la <span className='font-semibold'>derecha</span> si es <span className='font-semibold'>posterior</span>. También puedes tocar los extremos.
        </p>

        <div className='mt-6 flex items-center justify-center text-xs opacity-70 gap-2'>
          <svg width='16' height='16' viewBox='0 0 24 24' className='stroke-current'>
            <rect x='2' y='2' width='20' height='20' rx='5' ry='5' fill='none' strokeWidth='2' />
            <circle cx='12' cy='12' r='5' fill='none' strokeWidth='2' />
            <circle cx='18' cy='6' r='1.5' fill='currentColor' stroke='none' />
          </svg>
          <a href='https://instagram.com/ministrodelasartes' target='_blank' rel='noreferrer' className='hover:underline'>creado por @ministrodelasartes</a>
        </div>
      </div>
    </div>
  )
}
