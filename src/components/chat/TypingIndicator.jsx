import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function TypingIndicator({ inline = false }) {
  const dotsRef = useRef(null);

  useEffect(() => {
    if (!dotsRef.current) return;
    const dots = dotsRef.current.querySelectorAll('.typing-dot');

    const tl = gsap.timeline({ repeat: -1 });
    tl.to(dots, {
      y: -4,
      duration: 0.3,
      ease: 'sine.inOut',
      stagger: 0.12,
      yoyo: true,
      repeat: 1,
    });
    tl.to({}, { duration: 0.4 }); // pause between cycles

    return () => tl.kill();
  }, []);

  if (inline) {
    return (
      <span ref={dotsRef} className="inline-flex items-center gap-[3px]">
        <span className="typing-dot w-[5px] h-[5px] rounded-full bg-accent" />
        <span className="typing-dot w-[5px] h-[5px] rounded-full bg-accent" />
        <span className="typing-dot w-[5px] h-[5px] rounded-full bg-accent" />
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2.5 my-2.5 ml-1">
      <div className="bg-[#212121] border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm shadow-md flex items-center gap-1.5">
        <span ref={dotsRef} className="flex items-center gap-[4px]">
          <span className="typing-dot w-[7px] h-[7px] rounded-full bg-accent" />
          <span className="typing-dot w-[7px] h-[7px] rounded-full bg-accent" />
          <span className="typing-dot w-[7px] h-[7px] rounded-full bg-accent" />
        </span>
        <span className="font-sans text-xs font-bold text-text-tertiary ml-1.5">typing...</span>
      </div>
    </div>
  );
}
