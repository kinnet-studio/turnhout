import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import { Wrapper } from '@/components/PixiCanvas';
import { CardTable } from '@/engine/react';
import { initApp } from '@/utils/init-app';
import { standardDeck } from './deck';
const ZONES = [
    { id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 } },
    { id: 'hand', layout: 'fan', transform: { x: 0, y: 300 }, layoutOptions: { fanAngleDeg: 24 } },
    { id: 'discard', layout: 'pile', transform: { x: 400, y: 0 } },
];
function DemoContent() {
    const handleRef = useRef(null);
    const [cards, setCards] = useState(standardDeck());
    const scene = { cards, zones: ZONES };
    const onDrop = (i) => {
        if (!i.toZoneId)
            return; // rejected → snaps back automatically
        setCards((cs) => cs.map((c) => (c.id === i.cardId ? { ...c, zoneId: i.toZoneId, faceUp: i.toZoneId === 'hand' } : c)));
    };
    const onCardClick = (id) => {
        setCards((cs) => cs.map((c) => (c.id === id ? { ...c, faceUp: !c.faceUp } : c)));
    };
    const deal5 = () => {
        setCards((cs) => {
            let dealt = 0;
            return cs.map((c) => (c.zoneId === 'deck' && dealt < 5 ? (dealt++, { ...c, zoneId: 'hand', faceUp: true }) : c));
        });
    };
    return (_jsxs(_Fragment, { children: [_jsx(CardTable, { ref: handleRef, scene: scene, onDrop: onDrop, onCardClick: onCardClick }), _jsx("button", { style: { position: 'absolute', top: 12, left: 12, zIndex: 10 }, onClick: deal5, children: "Deal 5" })] }));
}
export function TableDemoPage() {
    const option = useMemo(() => ({ fullScreen: true, limitEntireViewPort: false }), []);
    return _jsx(Wrapper, { option: option, initFunction: initApp, children: _jsx(DemoContent, {}) });
}
