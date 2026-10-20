(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = "assemblylab-game-v1";
  const PROFILE_KEY = "assemblylab-player-profile-v1";
  const today = () => new Date().toISOString().slice(0, 10);
  const safeParse = (raw, fallback) => { try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };
  const defaultState = () => ({ xp: 0, solved: [], badges: [], streak: 0, lastPractice: "", dailyDone: "", dailySeed: "", seenWorlds: [], challengeSerial: 0 });
  let state = { ...defaultState(), ...safeParse(localStorage.getItem(STORAGE_KEY), {}) };
  if (!Array.isArray(state.solved)) state.solved = [];
  if (!Array.isArray(state.badges)) state.badges = [];
  if (!Array.isArray(state.seenWorlds)) state.seenWorlds = [];
  let current = null, answered = false, showingHint = false, dailyMode = false;
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const worlds = [
    ["01", "Binary Outpost", "Bits, bytes, hex and signed numbers", "Beginner", "binary"],
    ["02", "CPU Command Center", "Registers, flags and instruction state", "Beginner", "registers"],
    ["03", "Instruction Foundry", "MOV, LEA, arithmetic and operands", "Beginner", "instructions"],
    ["04", "Control-Flow City", "Comparisons, conditions, loops and jumps", "Intermediate", "control"],
    ["05", "Memory Maze", "Pointers, addressing, arrays and stack", "Intermediate", "memory"],
    ["06", "Function Forge", "Calls, returns and calling conventions", "Intermediate", "functions"],
    ["07", "OS Gateway", "Processes, APIs and system boundaries", "Intermediate", "os"],
    ["08", "Compiler Observatory", "Optimization and source-to-assembly", "Intermediate", "compiler"],
    ["09", "Architecture Frontier", "x86, x64, ARM32 and AArch64", "Advanced", "architecture"],
    ["10", "Bitwise Workshop", "Masks, shifts and data transformations", "Advanced", "bitwise"],
    ["11", "Concurrency Station", "Atomic operations and shared state", "Advanced", "concurrency"],
    ["12", "Reverse Engineering HQ", "Reconstruct logic from disassembly", "Advanced", "reversing"],
    ["13", "Analyst Investigation Lab", "Interpret behavior with evidence", "Expert", "malware"],
    ["14", "Expert Trials", "Mixed challenges and mastery missions", "Expert", "expert"]
  ];
  const worldsByKey = Object.fromEntries(worlds.map(w => [w[4], w]));
  let seed = 1;
  const rand = n => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % n; };
  const shuffle = arr => { const a = arr.slice(); for (let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}return a; };
  const fmtHex = n => `0x${n.toString(16).toUpperCase()}`;
  function makeChallenge(fixedSeed) {
    seed = fixedSeed >>> 0;
    const type = (state.challengeSerial - 1) % 24;
    let c;
    if (type === 0) {
      const a=1+rand(12), b=1+rand(9), result=a+b;
      c={id:`mov-add-${fixedSeed}`,title:"Follow the register",difficulty:"STARTER",world:"registers",prompt:"What value will be in EAX after these instructions?",code:`mov eax, ${a}\nadd eax, ${b}`,answer:String(result),explain:`MOV places ${a} in EAX. ADD adds ${b}, so EAX becomes ${result}.`,hint:"Start with the value assigned by MOV, then apply ADD.",options:[String(result),String(result+1),String(Math.abs(a-b)),String(a*b)]};
    } else if (type === 1) {
      const a=2+rand(14), b=1+rand(8), result=a-b;
      c={id:`sub-${fixedSeed}`,title:"Arithmetic checkpoint",difficulty:"STARTER",world:"instructions",prompt:"What is the final decimal value in EAX?",code:`mov eax, ${a}\nsub eax, ${b}`,answer:String(result),explain:`EAX starts at ${a}; SUB removes ${b}. The result is ${result}.`,hint:"SUB destination, source means destination minus source.",options:[String(result),String(a+b),String(b-a),String(a)]};
    } else if (type === 2) {
      const a=rand(16), b=rand(16), result=a ^ b;
      c={id:`xor-${fixedSeed}`,title:"Bitwise workshop",difficulty:"STARTER",world:"bitwise",prompt:`What is ${fmtHex(a)} XOR ${fmtHex(b)}?`,code:`mov al, ${fmtHex(a)}\nxor al, ${fmtHex(b)}`,answer:fmtHex(result),explain:`XOR sets a bit when the two input bits differ. ${fmtHex(a)} XOR ${fmtHex(b)} = ${fmtHex(result)}.`,hint:"Compare each bit: same bits produce 0; different bits produce 1.",options:[fmtHex(result),fmtHex(a|b),fmtHex(a&b),fmtHex(a+b)]};
    } else if (type === 3) {
      const n=1+rand(8), result=n*2;
      c={id:`shift-${fixedSeed}`,title:"Shift station",difficulty:"INTERMEDIATE",world:"bitwise",prompt:`For this unsigned value, what is EAX after the shift?`,code:`mov eax, ${n}\nshl eax, 1`,answer:String(result),explain:`A left shift by one moves bits one place left, equivalent to multiplying by 2 here: ${n} becomes ${result}.`,hint:"For this small positive value, SHL by one doubles it.",options:[String(result),String(n+1),String(n),String(n*4)]};
    } else if (type === 4) {
      const a=rand(10), b=rand(10), equal=a===b;
      c={id:`cmp-${fixedSeed}`,title:"Branch predictor",difficulty:"INTERMEDIATE",world:"control",prompt:`Will JE be taken after this comparison?`,code:`mov eax, ${a}\ncmp eax, ${b}\nje equal_path`,answer:equal?"Yes":"No",explain:equal?`Both operands are ${a}; CMP sets ZF, so JE is taken.`:`${a} and ${b} differ; CMP clears ZF, so JE is not taken.`,hint:"JE checks the zero flag set by the previous flag-setting instruction.",options:shuffle(["Yes","No","Only if EAX is negative","Always"]).slice(0,4)};
    } else if (type === 5) {
      const offset=[4,8,12,16][rand(4)], base=0x1000+rand(8)*0x100, idx=rand(5), address=base+idx*4+offset;
      const indexDecimal=idx*4, indexHex=fmtHex(indexDecimal), offsetHex=fmtHex(offset), baseDecimal=base;
      c={id:`address-${fixedSeed}`,title:"Memory maze",difficulty:"INTERMEDIATE",world:"memory",prompt:"Given the register values, what effective address is accessed? Keep decimal and hexadecimal values clearly separated.",code:`; Register values\n; RBX = ${fmtHex(base)} (${baseDecimal} decimal)\n; RCX = ${idx} decimal (${fmtHex(idx)} hex)\n; RCX × 4 = ${indexDecimal} decimal (${indexHex} hex)\n; displacement = ${offset} decimal (${offsetHex} hex)\nmov eax, [rbx+rcx*4+${offset}]`,answer:fmtHex(address),explain:`Step 1 — Index contribution: ${idx} × 4 = ${indexDecimal} decimal = ${indexHex} hexadecimal.\nStep 2 — Displacement: ${offset} decimal = ${offsetHex} hexadecimal.\nStep 3 — Hex addition: ${fmtHex(base)} + ${indexHex} + ${offsetHex} = ${fmtHex(address)}.\nDecimal check: ${baseDecimal} + ${indexDecimal} + ${offset} = ${address} decimal = ${fmtHex(address)}.\nRemember: [address] reads memory at that address; it does not load the address itself into EAX.`,hint:"Convert every offset to hexadecimal before adding to the hexadecimal base. Example: 12 decimal = 0xC, not 0x12. You can also verify by adding everything in decimal, including the base.",options:shuffle([fmtHex(address),fmtHex(base+idx+offset),fmtHex(base+idx*4),fmtHex(address+4)])};
    } else if (type === 6) {
      const opts=[{q:"Which instruction transfers control to a function and saves a return address?",code:"call target_function",a:"CALL",wrong:["JMP","LEA","CMP"],exp:"CALL transfers control and records a return address according to the architecture's calling mechanism."},{q:"Which instruction commonly returns from a function?",code:"ret",a:"RET",wrong:["POP","NOP","TEST"],exp:"RET uses the return address to transfer control back to the caller."},{q:"Which instruction compares operands by updating flags without saving a subtraction result?",code:"cmp eax, ebx",a:"CMP",wrong:["MOV","ADD","LEA"],exp:"CMP updates flags as if subtracting the source from the destination; it does not store that subtraction result."}][rand(3)];
      c={id:`meaning-${fixedSeed}`,title:"Instruction identity",difficulty:"STARTER",world:"functions",prompt:opts.q,code:opts.code,answer:opts.a,explain:opts.exp,hint:"Think about whether the instruction changes data, flags or control flow.",options:shuffle([opts.a,...opts.wrong])};
    } else if (type === 7) {
      const choices=[{q:"What does square-bracket syntax usually mean in Intel-style x86 assembly?",a:"Memory access",wrong:["Immediate constant","Comment","Always a function call"],exp:"Square brackets usually mean that the expression is an effective memory address whose contents are read or written."},{q:"What does XOR EAX, EAX commonly do?",a:"Sets EAX to zero",wrong:["Increments EAX","Returns from a function","Loads a memory address"],exp:"A value XORed with itself is zero. The instruction also updates flags."},{q:"Does one call to a suspicious-looking API prove a program is malware?",a:"No; context is required",wrong:["Yes, always","Only on x64","Only if it returns zero"],exp:"Interpret arguments, call context, data flow and runtime evidence. An API name alone is not a verdict."}][rand(3)];
      c={id:`concept-${fixedSeed}`,title:"Analyst reasoning",difficulty:"INTERMEDIATE",world:"reversing",prompt:choices.q,code:"; Read the question, then choose the best interpretation.",answer:choices.a,explain:choices.exp,hint:"Prefer the interpretation that explains the instruction while acknowledging context and evidence.",options:shuffle([choices.a,...choices.wrong])};
    } else if (type === 8) {
      const n=1+rand(15), h=fmtHex(n);
      c={id:`binary-${fixedSeed}`,title:"Hexadecimal decoder",difficulty:"STARTER",world:"binary",prompt:`What is ${h} in decimal?`,code:`; Convert hexadecimal to decimal\n; ${h} = ?`,answer:String(n),explain:`${h} has value ${n} in decimal. For a single hex digit from 0x0 to 0xF, the decimal value is the same digit value (A=10, B=11, C=12, D=13, E=14, F=15). For values above 0xF, use place values: each position is a power of 16.`,hint:"Hex digits A–F represent 10–15. For 0x10, the 1 is in the sixteens place.",options:shuffle([String(n),String(n+1),String(Math.max(0,n-1)),String(n*2)])};
    } else if (type === 9) {
      const a=1+rand(15), b=1+rand(15), equal=a===b;
      c={id:`flags-${fixedSeed}`,title:"Flag tracker",difficulty:"INTERMEDIATE",world:"control",prompt:"After CMP EAX, EBX, will JE be taken?",code:`mov eax, ${a}\nmov ebx, ${b}\ncmp eax, ebx\nje equal_path`,answer:equal?"Yes":"No",explain:equal?`EAX and EBX are both ${a}. CMP sets ZF because they are equal, so JE is taken.`:`EAX=${a} and EBX=${b}. CMP finds them unequal, so ZF is clear and JE is not taken.`,hint:"JE checks the zero flag. CMP sets it when the compared values are equal.",options:shuffle(["Yes","No","Only when EAX is zero","Always"])};
    } else if (type === 10) {
      const n=1+rand(12), bytes=n*8;
      c={id:`stack-${fixedSeed}`,title:"Stack navigator",difficulty:"INTERMEDIATE",world:"memory",prompt:`If RSP is ${fmtHex(0x8000)} and a 8-byte value is pushed, what is the new RSP in the simplified x86-64 model?`,code:`; Initial RSP = 0x8000\npush rax\n; A push decrements RSP by 8 bytes`,answer:fmtHex(0x8000-8),explain:`In this simplified 64-bit example, PUSH decreases RSP by 8 bytes: 0x8000 - 0x8 = ${fmtHex(0x8000-8)}. The value is then stored at the new stack address.`,hint:"A 64-bit PUSH uses 8 bytes, so subtract 0x8 from RSP.",options:shuffle([fmtHex(0x8000-8),fmtHex(0x8000+8),fmtHex(0x8000-4),fmtHex(0x8000)])};
    } else if (type === 11) {
      const n=1+rand(100), doubled=n*2;
      c={id:`signed-${fixedSeed}`,title:"Shift and width detective",difficulty:"INTERMEDIATE",world:"architecture",prompt:`For this small unsigned value, what is ${n} shifted left by one bit?`,code:`mov eax, ${n}\nshl eax, 1`,answer:String(doubled),explain:`SHL by one doubles this value when no significant bits are lost: ${n} becomes ${doubled}. Real fixed-width registers can overflow.`,hint:"A left shift by one doubles the value when it fits in the register.",options:shuffle([String(doubled),String(n+1),String(n),String(n*4)])};
    } else if (type === 12) {
      const a=1+rand(20), b=1+rand(10), result=a*b;
      c={id:`multiply-${fixedSeed}`,title:"Multiply station",difficulty:"INTERMEDIATE",world:"instructions",prompt:`What value is in EAX after this IMUL?`,code:`mov eax, ${a}\nimul eax, ${b}`,answer:String(result),explain:`The two-operand IMUL multiplies the destination by the source: ${a} × ${b} = ${result}.`,hint:"Multiply the starting EAX value by the immediate operand.",options:shuffle([String(result),String(a+b),String(a-b),String(result+1)])};
    } else if (type === 13) {
      const a=1+rand(30), b=1+rand(30), result=a&b;
      c={id:`and-mask-${fixedSeed}`,title:"Mask workshop",difficulty:"INTERMEDIATE",world:"bitwise",prompt:`What is the bitwise AND result?`,code:`mov al, ${fmtHex(a)}\nand al, ${fmtHex(b)}`,answer:fmtHex(result),explain:`AND keeps a bit only when both inputs have that bit set. ${fmtHex(a)} AND ${fmtHex(b)} = ${fmtHex(result)}.`,hint:"Write both values in binary; keep only the positions where both bits are 1.",options:shuffle([fmtHex(result),fmtHex(a|b),fmtHex(a^b),fmtHex(a+b)])};
    } else if (type === 14) {
      const n=1+rand(30), result=n-1;
      c={id:`decrement-${fixedSeed}`,title:"Counter control",difficulty:"STARTER",world:"control",prompt:"What is EAX after DEC EAX?",code:`mov eax, ${n}\ndec eax`,answer:String(result),explain:`DEC subtracts one from the destination, so ${n} becomes ${result}.`,hint:"DEC reduces the destination by exactly one.",options:shuffle([String(result),String(n+1),String(n),String(0)])};
    } else if (type === 15) {
      const a=1+rand(20), b=1+rand(20), less=a<b;
      c={id:`unsigned-branch-${fixedSeed}`,title:"Unsigned branch check",difficulty:"INTERMEDIATE",world:"control",prompt:"Will JB be taken after CMP EAX, EBX? (Treat both values as unsigned.)",code:`mov eax, ${a}\nmov ebx, ${b}\ncmp eax, ebx\njb below`,answer:less?"Yes":"No",explain:less?`${a} is unsigned-below ${b}, so JB is taken.`:`${a} is not unsigned-below ${b}, so JB is not taken.`,hint:"JB tests the unsigned-below condition from CMP.",options:shuffle(["Yes","No","Always","Only if equal"])};
    } else if (type === 16) {
      const n=1+rand(10), bytes=n*4;
      c={id:`array-offset-${fixedSeed}`,title:"Array indexer",difficulty:"INTERMEDIATE",world:"memory",prompt:`An array element is 4 bytes. What byte offset is index ${n}?`,code:`; element size = 4 bytes\n; offset = index × element size`,answer:String(bytes),explain:`Array offset = ${n} × 4 = ${bytes} bytes. The actual address also includes the array base.`,hint:"Multiply the index by the size of each element.",options:shuffle([String(bytes),String(n+4),String(n*8),String(n)])};
    } else if (type === 17) {
      const n=1+rand(10), initial=0x9000, result=initial+n*8;
      c={id:`scaled-address-${fixedSeed}`,title:"Scaled addressing",difficulty:"INTERMEDIATE",world:"memory",prompt:`What effective address is computed by [RBX+RCX*8] for these values?`,code:`; RBX = ${fmtHex(initial)}\n; RCX = ${n}\nmov rax, [rbx+rcx*8]`,answer:fmtHex(result),explain:`Index contribution: ${n} × 8 = ${n*8} bytes. Add it to the base: ${fmtHex(initial)} + ${fmtHex(n*8)} = ${fmtHex(result)}.`,hint:"Multiply RCX by the scale, then add the result to RBX.",options:shuffle([fmtHex(result),fmtHex(initial+n),fmtHex(initial+n*4),fmtHex(result+8)])};
    } else if (type === 18) {
      const n=1+rand(12), result=n+1;
      c={id:`lea-${fixedSeed}`,title:"LEA or load?",difficulty:"INTERMEDIATE",world:"instructions",prompt:`What value does LEA compute in RAX here?`,code:`; RBX = ${fmtHex(0x2000)} and RCX = ${n}\nlea rax, [rbx+rcx*1+1]`,answer:fmtHex(0x2000+result),explain:`LEA computes the effective address expression without reading memory: 0x2000 + ${n} + 1 = ${fmtHex(0x2000+result)}.`,hint:"LEA calculates the address expression; unlike MOV with brackets, it does not dereference memory.",options:shuffle([fmtHex(0x2000+result),fmtHex(0x2000+n),fmtHex(n+1),fmtHex(0x2000+result+8)])};
    } else if (type === 19) {
      const n=1+rand(20), result=n&1;
      c={id:`parity-${fixedSeed}`,title:"Odd or even?",difficulty:"STARTER",world:"binary",prompt:`Is ${n} even or odd?`,code:`; Check the least significant bit of ${n}\n; ${n} in binary ends with ${result}`,answer:result?"Odd":"Even",explain:result?`${n} has its least significant bit set, so it is odd.`:`${n} has its least significant bit clear, so it is even.`,hint:"An integer ending in binary 1 is odd; ending in 0 is even.",options:shuffle(["Odd","Even","Both","Cannot tell"])};
    } else if (type === 20) {
      const a=1+rand(15), b=1+rand(15), result=a|b;
      c={id:`or-bits-${fixedSeed}`,title:"Bitwise OR lab",difficulty:"INTERMEDIATE",world:"bitwise",prompt:`What is ${fmtHex(a)} OR ${fmtHex(b)}?`,code:`mov al, ${fmtHex(a)}\nor al, ${fmtHex(b)}`,answer:fmtHex(result),explain:`OR sets a bit when either input bit is 1. The result is ${fmtHex(result)}.`,hint:"For each bit position, the output is 1 if either input has a 1.",options:shuffle([fmtHex(result),fmtHex(a&b),fmtHex(a^b),fmtHex(a+b)])};
    } else if (type === 21) {
      const n=1+rand(12), result=n>>1;
      c={id:`logical-shift-${fixedSeed}`,title:"Right-shift station",difficulty:"INTERMEDIATE",world:"bitwise",prompt:`What is the unsigned result of shifting ${n} right by one bit?`,code:`mov eax, ${n}\nshr eax, 1`,answer:String(result),explain:`SHR shifts bits right and fills the leftmost bits with zero. For this unsigned value, floor(${n}/2) = ${result}.`,hint:"An unsigned logical right shift by one is integer division by two, rounding down.",options:shuffle([String(result),String(n*2),String(n),String(Math.max(0,n-1))])};
    } else if (type === 22) {
      const n=1+rand(10), result=n+4;
      c={id:`call-return-${fixedSeed}`,title:"Return-value tracker",difficulty:"INTERMEDIATE",world:"functions",prompt:"Which register commonly holds an integer return value under the x86-64 ABIs shown in this lesson?",code:`call calculate_value\n; inspect RAX after return`,answer:"RAX",explain:"For common x86-64 Windows and System V ABIs, integer/pointer return values are commonly placed in RAX/EAX, depending on width.",hint:"It is the accumulator register whose 32-bit name is EAX.",options:shuffle(["RAX","RSP","RIP","RBP"])};
    } else {
      const choices=[{q:"Which evidence best supports a claim that a process injected code into another process?",a:"Correlated memory/write and remote-execution evidence",wrong:["A suspicious filename alone","One API name without arguments","A high CPU reading alone"],exp:"Correlate process access, memory operations, target process, execution transfer and runtime telemetry."},{q:"What should you do before interpreting an unfamiliar mnemonic?",a:"Confirm the CPU architecture and syntax",wrong:["Assume x86-64","Classify it as malicious","Ignore operand widths"],exp:"Mnemonic meanings and operand conventions vary by architecture and syntax."},{q:"What does a backward conditional branch often indicate?",a:"A loop or retry path that needs context",wrong:["Definitely malware","Always a function return","A network connection"],exp:"Backward branches often implement loops, retries or state machines; inspect the loop body and exit conditions."}][rand(3)];
      c={id:`investigation-${fixedSeed}`,title:"Reverse-engineering evidence",difficulty:"ADVANCED",world:"malware",prompt:choices.q,code:"; Correlate control flow, operands and runtime evidence.",answer:choices.a,explain:choices.exp,hint:"Choose the evidence-based answer, not a verdict from a single clue.",options:shuffle([choices.a,...choices.wrong])};
    }
    c.options=Array.from(new Set(c.options));
    while(c.options.length<4) c.options.push(`Alternative ${c.options.length+1}`);
    return c;
  }
  function getLevel(xp){return Math.floor(Math.sqrt(xp/100))+1;}
  function xpForLevel(level){return (level-1)*(level-1)*100;}
  function updateStreak(){const t=today();if(state.lastPractice===t)return;if(!state.lastPractice){state.streak=1;}else{const prev=new Date(`${state.lastPractice}T00:00:00Z`), now=new Date(`${t}T00:00:00Z`), diff=Math.round((now-prev)/86400000);state.streak=diff===1?state.streak+1:1;}state.lastPractice=t;}
  const badgeDefs=[
    ["first-step","First Steps","Solve your first challenge",s=>s.solved.length>=1],
    ["curious-mind","Curious Mind","Solve 10 unique challenges",s=>s.solved.length>=10],
    ["problem-solver","Problem Solver","Solve 25 unique challenges",s=>s.solved.length>=25],
    ["xp-hunter","XP Hunter","Earn 500 XP",s=>s.xp>=500],
    ["week-warrior","Consistent Learner","Build a 7-day practice streak",s=>s.streak>=7],
    ["world-traveler","World Traveler","Explore 5 learning worlds",s=>s.seenWorlds.length>=5]
  ];
  function awardBadges(){const fresh=[];badgeDefs.forEach(b=>{if(!state.badges.includes(b[0])&&b[3](state)){state.badges.push(b[0]);fresh.push(b);}});return fresh;}
  function renderBadges(){const el=$("badge-list");if(!state.badges.length){el.innerHTML='<div class="badge-empty">Solve challenges to earn your first badge.</div>';return;}el.innerHTML=state.badges.slice(-4).reverse().map(id=>{const b=badgeDefs.find(x=>x[0]===id);return b?`<div class="earned-badge"><span class="badge-medal">★</span><span><strong>${esc(b[1])}</strong><small>${esc(b[2])}</small></span></div>`:"";}).join("");}
  function renderStats(){const level=getLevel(state.xp), currentBase=xpForLevel(level), nextBase=xpForLevel(level+1), into=state.xp-currentBase, span=nextBase-currentBase;$("player-xp").textContent=`${state.xp} XP`;$ ("player-rank").textContent=`Level ${level} · ${level<3?"Register Rookie":level<6?"Control-Flow Scout":level<10?"Reverse Engineering Apprentice":"Assembly Master"}`;$("xp-to-next").textContent=`${Math.max(0,nextBase-state.xp)} XP to next level`;$("xp-fill").style.width=`${Math.min(100,into/span*100)}%`;$("stat-solved").textContent=state.solved.length;$("stat-streak").textContent=`${state.streak} ${state.streak===1?"day":"days"}`;$("stat-badges").textContent=state.badges.length;const progress=getLessonProgress();$("stat-lessons").textContent=progress.completedCount;$("daily-status").textContent=state.dailyDone===today()?"Completed today ✓":"Not completed today";$("daily-start").textContent=state.dailyDone===today()?"Daily mission completed ✓":"Play daily mission";$("daily-start").disabled=state.dailyDone===today();renderBadges();renderPlayerProfile();renderCertificate();}

  function getProfileName(){return String(localStorage.getItem(PROFILE_KEY)||"").trim().slice(0,40);}
  function renderPlayerProfile(){
    const input=$("player-name-input"), title=$("player-title"), avatar=document.querySelector(".player-avatar");
    const name=getProfileName();
    if(input && input.value!==name) input.value=name;
    if(title) title.textContent=name||"Assembly Explorer";
    if(avatar) avatar.innerHTML=`${esc((name||"A").trim().charAt(0).toUpperCase())}<span>/</span>`;
  }
  function getLessonProgress(){
    const lessons=(window.ASSEMBLYLAB_DATA&&Array.isArray(window.ASSEMBLYLAB_DATA.lessons))?window.ASSEMBLYLAB_DATA.lessons:[];
    let raw=safeParse(localStorage.getItem("assemblylab-completed"),[]);
    if(!Array.isArray(raw)) raw=[];
    const completedIds=new Set(raw.filter(x=>typeof x==="string"));
    const completedCount=lessons.filter(l=>completedIds.has(l.id)).length;
    return {lessons,total:lessons.length,completedCount,eligible:lessons.length>0&&completedCount===lessons.length&&Number(state.xp)>500};
  }
  function renderCertificate(){
    const progress=getLessonProgress();
    const status=$("certificate-status"), lessons=$("certificate-lesson-progress"), xp=$("certificate-xp-progress"), btn=$("download-certificate");
    if(lessons) lessons.textContent=`${progress.completedCount} / ${progress.total} lessons`;
    if(xp) xp.textContent=`${Number(state.xp)||0} / 501 XP minimum`;
    if(status) status.textContent=progress.eligible?`Congratulations${getProfileName()?", "+getProfileName():""}! You completed every lesson and earned more than 500 XP.`:`Complete all ${progress.total} lessons and earn at least 501 XP. Your certificate unlocks when both requirements are met.`;
    if(btn){btn.disabled=!progress.eligible;btn.textContent=progress.eligible?"Generate my certificate":"Certificate locked";}
  }
  function makeCertificate(){
    const progress=getLessonProgress();
    if(!progress.eligible){renderCertificate();alert(`Certificate locked: ${progress.completedCount}/${progress.total} lessons completed and ${Number(state.xp)||0}/501 XP. Complete the remaining requirements first.`);return;}
    const name=getProfileName()||"AssemblyLab Learner";
    const date=new Date().toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});
    const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AssemblyLab Certificate</title><style>body{margin:0;background:#f5f3ed;color:#18233a;font-family:Georgia,'Times New Roman',serif}.sheet{box-sizing:border-box;max-width:1000px;min-height:680px;margin:28px auto;padding:54px;border:12px double #b28b43;background:#fffdf8;text-align:center;display:flex;flex-direction:column;justify-content:center}.brand{font:700 13px Arial,sans-serif;letter-spacing:5px;color:#856524}.rule{width:130px;height:2px;background:#b28b43;margin:24px auto}.kicker{font:700 12px Arial,sans-serif;letter-spacing:4px;color:#6d7890}.name{font-size:44px;margin:26px 0 18px;color:#162b4b}.body{font-size:18px;line-height:1.7;max-width:680px;margin:0 auto}.stats{font:700 13px Arial,sans-serif;letter-spacing:1px;margin-top:26px;color:#6b5b39}.date{font:14px Arial,sans-serif;margin-top:38px}.foot{font:11px Arial,sans-serif;color:#727b89;margin-top:32px}.print{margin:18px auto;display:block;padding:10px 18px;border:0;border-radius:8px;background:#183b66;color:white;font-weight:700;cursor:pointer}@media print{body{background:#fff}.sheet{margin:0 auto;min-height:95vh;break-inside:avoid}.print{display:none}}@media(max-width:700px){.sheet{margin:10px;padding:24px;min-height:600px}.name{font-size:32px}}</style></head><body><main class="sheet"><div class="brand">ASSEMBLYLAB</div><div class="rule"></div><div class="kicker">CERTIFICATE OF COMPLETION</div><h1 class="name">${esc(name)}</h1><p class="body">This certificate recognizes completion of the AssemblyLab learning path, covering foundational assembly concepts, instruction reasoning, memory, control flow and reverse-engineering practice.</p><div class="stats">${progress.total} LESSONS COMPLETED &nbsp; · &nbsp; ${Number(state.xp)} XP EARNED</div><div class="date">Issued ${esc(date)}</div><div class="foot">Self-generated learning record · Not an accredited or independently verified credential.</div></main><button class="print" onclick="window.print()">Print / Save as PDF</button></body></html>`;
    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const win=window.open(url,"_blank");
    if(!win){URL.revokeObjectURL(url);alert("Your browser blocked the certificate window. Allow pop-ups for this site, then click Generate my certificate again.");return;}
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  function renderWorlds(){const grid=$("world-grid"), level=getLevel(state.xp);grid.innerHTML=worlds.map((w,i)=>{const required=i<3?1:Math.min(10,2+Math.floor((i-3)/2));const unlocked=level>=required;const visited=state.seenWorlds.includes(w[4]);return `<button class="world-card ${unlocked?"world-available":"world-locked"}" data-world="${esc(w[4])}" data-required="${required}" ${unlocked?"":"aria-label=\"Locked: "+esc(w[1])+", requires level "+required+"\""}><span class="world-number">WORLD ${w[0]} · ${unlocked?"UNLOCKED":"LEVEL "+required+" REQUIRED"}</span><strong>${esc(w[1])}</strong><p>${esc(w[2])}</p><span class="world-footer"><span>${esc(w[3])}${visited?" · Visited":""}</span><span>${unlocked?"Explore world →":"🔒 Locked"}</span></span></button>`;}).join("");grid.querySelectorAll("[data-world]").forEach(btn=>btn.addEventListener("click",()=>{const key=btn.dataset.world, required=Number(btn.dataset.required);if(level<required){$("challenge-feedback").innerHTML=`<strong>World locked</strong><br>Reach Level ${required} to unlock this world. Solve the current challenge to earn XP; you can return whenever you're ready.`;return;}if(!state.seenWorlds.includes(key)){state.seenWorlds.push(key);const fresh=awardBadges();save();renderStats();renderWorlds();}const w=worldsByKey[key];if(w){loadChallenge(false,`${w[1]} · Skill check`,key);}}));}
  function worldPrompt(key){return ({binary:"Which hexadecimal value equals decimal 16?",registers:"What is the final value in EAX?",instructions:"Which instruction adds a value to a register?",control:"When is JE taken?",memory:"What does [RBX+8] represent?",functions:"Which instruction typically calls a function?",os:"Does an API name alone prove malicious behavior?",compiler:"What can compiler optimization change?",architecture:"Can the same assembly mnemonic differ across architectures?",bitwise:"What does XOR of a value with itself produce?",concurrency:"Why do atomic operations matter?",reversing:"What should you inspect around an indirect call?",malware:"What evidence supports a behavior hypothesis?",expert:"Why should analysis combine multiple evidence sources?"})[key]||"Choose the best explanation.";}
  function worldCode(key){return ({binary:"; Hexadecimal quick check\n16 decimal = ?",registers:"mov eax, 5\nadd eax, 2",instructions:"; Choose the instruction that adds\nadd eax, 1",control:"cmp eax, ebx\nje equal_path",memory:"; RBX contains a base address\nmov eax, [rbx+8]",functions:"call target_function\n; execution returns after RET",os:"; API call observed\n; inspect arguments and caller",compiler:"; Same source, different optimization\n; compare generated output",architecture:"; Identify architecture first\n; then interpret mnemonic",bitwise:"mov eax, 7\nxor eax, eax",concurrency:"; Shared data can be updated by threads\n; consider atomicity",reversing:"call qword ptr [rax]\n; resolve the call target",malware:"; Hypothesis needs corroborating evidence\n; trace arguments and data flow",expert:"; Combine control flow + data flow\n; confirm with runtime evidence"})[key]||"; Read the snippet";}
  function loadChallenge(isDaily=false, title=null, world=null){dailyMode=isDaily;showingHint=false;answered=false;state.challengeSerial+=1;save();let challengeSeed;if(isDaily){challengeSeed=hash(today()+"-assemblylab-daily");state.dailySeed=today();}else{challengeSeed=hash(`${Date.now()}-${state.challengeSerial}-${Math.random()}`);}current=makeChallenge(challengeSeed);if(world){current.world=world;current.id=`${current.id}-${world}`;}if(title)current.title=title;$("challenge-title").textContent=isDaily?"Daily Mission · "+current.title:current.title;$("challenge-difficulty").textContent=current.difficulty;$("challenge-prompt").textContent=current.prompt;$("challenge-code").textContent=current.code;$("challenge-feedback").textContent=isDaily?"Daily mission: solve it correctly to earn the daily bonus.":"Choose an answer. Hints are available if you need them.";$("challenge-options").innerHTML=current.options.map((o,i)=>`<button class="challenge-option" data-option="${i}">${esc(o)}</button>`).join("");$("challenge-options").querySelectorAll("[data-option]").forEach(b=>b.addEventListener("click",()=>answer(b, b.textContent)));$("challenge-hint").disabled=false;$("challenge-next").disabled=true;$("challenge-next").textContent="Next challenge →";const godboltUrl="https://godbolt.org/";$("challenge-godbolt").href=godboltUrl;}
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function answer(btn, value){if(answered)return;answered=true;const correct=value===current.answer;$("challenge-options").querySelectorAll("button").forEach(b=>{b.disabled=true;if(b.textContent===current.answer)b.classList.add("correct");});if(!correct)btn.classList.add("incorrect");let bonus=0, first=!state.solved.includes(current.id);if(correct){updateStreak();if(first){state.solved.push(current.id);bonus=20;state.xp+=bonus;}if(dailyMode&&state.dailyDone!==today()){state.dailyDone=today();state.xp+=25;bonus+=25;}const fresh=awardBadges();save();renderStats();renderWorlds();$("challenge-feedback").innerHTML=`<strong class="feedback-good">Correct! ${bonus?`+${bonus} XP`:"Already solved — keep practicing"}</strong><br>${esc(current.explain)}${fresh.length?`<br>Badge earned: ${esc(fresh.map(b=>b[1]).join(", "))}!`:""}`;}else{$("challenge-feedback").innerHTML=`<strong class="feedback-warn">Not quite — no XP lost.</strong><br>${esc(current.explain)} Try another variation to reinforce the concept.`;}$("challenge-next").disabled=false;$("challenge-next").textContent=correct?"Next challenge →":"Try another challenge →";$("challenge-hint").disabled=true;}
  function showHint(){if(!current||answered||showingHint)return;showingHint=true;$("challenge-feedback").innerHTML=`<strong>Hint</strong><br>${esc(current.hint)}<br><span class="hint-note">Hints are part of learning; no penalty.</span>`;}
  function startDaily(){if(state.dailyDone===today()){return;}loadChallenge(true);}
  $("save-player-name").addEventListener("click",()=>{const value=$("player-name-input").value.trim().slice(0,40);if(value)localStorage.setItem(PROFILE_KEY,value);else localStorage.removeItem(PROFILE_KEY);renderPlayerProfile();renderCertificate();});
  $("player-name-input").addEventListener("keydown",e=>{if(e.key==="Enter")$("save-player-name").click();});
  $("player-name-input").addEventListener("change",()=>{const value=$("player-name-input").value.trim().slice(0,40);if(value)localStorage.setItem(PROFILE_KEY,value);else localStorage.removeItem(PROFILE_KEY);renderPlayerProfile();renderCertificate();});
  $("download-certificate").addEventListener("click",makeCertificate);
  $("challenge-hint").addEventListener("click",showHint);
  $("challenge-next").addEventListener("click",()=>loadChallenge(false));
  $("daily-start").addEventListener("click",startDaily);
  document.querySelectorAll('[data-view="game"],[data-go="game"]').forEach(el=>el.addEventListener("click",()=>{renderStats();}));
  renderStats();renderWorlds();loadChallenge(false);
})();
