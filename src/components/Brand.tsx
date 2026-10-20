export function BrandMark({ className = '' }: { className?: string }) {
    return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className={'brand-symbol ' + className}><path d="M6 34V16L20 6l14 10v18H6Z" stroke="currentColor" strokeWidth="2" /><path d="M13 34V20h14v14M20 20v14M6 16h28" stroke="currentColor" strokeWidth="2" /><path d="M20 6V2M2 34h36" stroke="currentColor" strokeWidth="2" /></svg>;
}
/** Original decorative vector architecture, not a representation of a real property. */
export function ResidenceIllustration({ className = '' }: { className?: string }) {
    return <svg viewBox="0 0 600 520" fill="none" aria-hidden="true" className={'residence-art ' + className}>
        <circle cx="436" cy="118" r="66" fill="#d8c8a7" />
        <path d="M52 450h496M90 464h420" stroke="#a2ab98" />
        <path d="M152 441V149l166-69 145 69v292" fill="#ebe6d8" stroke="#254d3d" strokeWidth="2" />
        <path d="m318 80 145 69v292H318V80Z" fill="#ced4c0" />
        <path d="M123 160 318 74l173 82M123 170l195-84 173 81" stroke="#254d3d" strokeWidth="3" />
        <path d="M318 89v352M152 229h311M152 322h311" stroke="#254d3d" strokeWidth="2" />
        {[181,239,345,402].map(x => [168,258,350].map(y => <g key={x+'-'+y}><path d={`M${x} ${y}h30v48h-30z`} fill={y === 350 && x === 239 ? '#bb7657' : '#42604c'} /><path d={`M${x+15} ${y}v48M${x} ${y+24}h30`} stroke="#e9e6d8" strokeWidth="1.2" /></g>))}
        <path d="M270 441v-72a28 28 0 0 1 56 0v72" fill="#274b3a" /><path d="M298 345v96" stroke="#bcb59c" />
        <path d="M127 441V319M105 368h43M101 344l26-59 27 59M98 380l29-67 31 67" stroke="#45654a" strokeWidth="9" strokeLinecap="round" />
        <path d="M496 441v-99M478 376h36M474 361l22-50 23 50M470 396l26-59 27 59" stroke="#45654a" strokeWidth="8" strokeLinecap="round" />
        <path d="M262 450h72l37 45H226l36-45Z" fill="#d9c9ac" /><path d="M81 450h73M447 450h80" stroke="#254d3d" strokeWidth="3" />
        <path d="M73 100h95M120 53v94M482 234h51M508 208v52" stroke="#b5bca9" strokeDasharray="3 6" />
        <path d="M152 484h55M152 480v8M207 480v8M347 484h116M347 480v8M463 480v8" stroke="#7d8d75" />
    </svg>;
}
