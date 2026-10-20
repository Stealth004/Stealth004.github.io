'use strict';
(function () {
  const STORE='net005a-ch3-v1';
  const A=['WG','G','WO','BL','WBL','O','WBR','BR'];
  const B=['WO','O','WG','BL','WBL','G','WBR','BR'];
  const palette=[
    {id:'WO',name:'White/Orange',css:'linear-gradient(90deg,#f8f4e8 49%,#ed893b 50%)'},
    {id:'O',name:'Orange',css:'#ed893b'},
    {id:'WG',name:'White/Green',css:'linear-gradient(90deg,#f8f4e8 49%,#39b981 50%)'},
    {id:'G',name:'Green',css:'#39b981'},
    {id:'BL',name:'Blue',css:'#558eea'},
    {id:'WBL',name:'White/Blue',css:'linear-gradient(90deg,#f8f4e8 49%,#558eea 50%)'},
    {id:'WBR',name:'White/Brown',css:'linear-gradient(90deg,#f8f4e8 49%,#a06f56 50%)'},
    {id:'BR',name:'Brown',css:'#a06f56'}
  ];
  const mediums=[
    {id:'utp',name:'Twisted-pair UTP',kicker:'COPPER · BALANCED PAIRS',subtitle:'Common office Ethernet',facts:[['Construction','Four twisted copper pairs; no overall shield'],['Strength','Cost-effective access links and PoE'],['Limitation','10GBASE-T at 100 m generally calls for Cat 6A'] ],tip:'The twist reduces electromagnetic coupling. UTP does not mean electromagnetic noise is impossible.'},
    {id:'stp',name:'Shielded twisted pair',kicker:'COPPER · SHIELDED',subtitle:'Electrical noise environments',facts:[['Construction','Twisted copper pairs with foil/braid shielding'],['Strength','Can help manage EMI when designed and grounded correctly'],['Limitation','Shielding is not a substitute for standards-compliant runs'] ],tip:'Ask whether EMI is the constraint. Proper bonding/grounding matters; fiber offers electrical isolation.'},
    {id:'smf',name:'Single-mode fiber',kicker:'OPTICAL · SMALL CORE',subtitle:'Long-distance links',facts:[['Construction','Typically ~9 µm core, commonly OS2'],['Strength','Long distances with matched optics, e.g. 10GBASE-LR'],['Limitation','Needs compatible wavelength, optics, and connector'] ],tip:'Core size does NOT decide distance alone: transceiver standard, optics, and power budget do.'},
    {id:'mmf',name:'Multimode fiber',kicker:'OPTICAL · LARGER CORE',subtitle:'Shorter building/backbone links',facts:[['Construction','Typical 50 µm core for OM3/OM4'],['Strength','10GBASE-SR with suitable optics; OM3 up to 300 m'],['Limitation','Modal dispersion limits reach at high speeds'] ],tip:'SR and LR describe optical Ethernet variants; do not mix different optical standards casually.'},
    {id:'coax',name:'Coaxial cable',kicker:'COPPER · CONCENTRIC',subtitle:'Broadband and RF',facts:[['Construction','Center conductor, dielectric, shield, outer jacket'],['Strength','Shielded RF transmission such as cable broadband'],['Limitation','F-type is common with RG-6; BNC is common in other RF/legacy uses'] ],tip:'Do not assume a coax connector automatically connects to an Ethernet RJ45 port.'},
    {id:'dac',name:'Direct attach copper',kicker:'TWINAX · INTEGRATED ENDS',subtitle:'Short rack-to-rack interconnects',facts:[['Construction','Typically a factory-terminated twinax cable assembly'],['Strength','Short high-speed switch/server connections'],['Limitation','Port type, speed, cable reach and vendor support must agree'] ],tip:'An SFP+ DAC includes integrated connector ends; it is not a separately plugged-in LC patch cord.'}
  ];
  const connectors=[
    {id:'rj45',name:'RJ45 / 8P8C',kind:'rj',desc:'Copper Ethernet twisted-pair termination; 8 contacts.',trap:'Compare RJ45 Ethernet with smaller RJ11 telephone connector.'},
    {id:'rj11',name:'RJ11',kind:'rj11',desc:'Smaller modular telephone connector; commonly 6 positions.',trap:'RJ11 is not an eight-contact Ethernet connector.'},
    {id:'lc',name:'LC duplex',kind:'lc',desc:'Small optical ferrule; duplex pairs carry TX and RX.',trap:'LC is a physical connector, not a fiber mode or Ethernet speed.'},
    {id:'sc',name:'SC',kind:'sc',desc:'Square push/pull fiber connector, larger than LC.',trap:'SC and LC may both terminate single-mode or multimode fiber.'},
    {id:'st',name:'ST',kind:'st',desc:'Round bayonet-lock fiber connector.',trap:'ST connector is different from STP shielded twisted pair.'},
    {id:'mpo',name:'MPO',kind:'mpo',desc:'Multi-fiber optical connector used for high-density fiber links.',trap:'Know fiber count and polarity; MPO is not a single-fiber LC.'},
    {id:'f',name:'F-type',kind:'f',desc:'Threaded coaxial connector widely used for RG-6 broadband.',trap:'F-type does not terminate Ethernet twisted pairs.'},
    {id:'bnc',name:'BNC',kind:'bnc',desc:'Bayonet coaxial connector often seen in RF and legacy networks.',trap:'BNC is coaxial; ST is a bayonet-style fiber connector.'},
    {id:'sfp',name:'SFP / SFP+',kind:'sfp',desc:'Pluggable interface/transceiver form factor; speed depends on module.',trap:'SFP+ often refers to 10 Gb/s; compatible protocol and optics still matter.'},
    {id:'qsfp',name:'QSFP family',kind:'qsfp',desc:'High-density quad-lane pluggable transceiver family.',trap:'QSFP is a family, not one fixed data rate.'}
  ];
  const linkMedia=['Cat 6A UTP','Cat 6A STP','OM3 multimode fiber','OS2 single-mode fiber','RG-6 coaxial','SFP+ direct attach copper'];
  const linkConnect=['RJ45 (8P8C)','LC duplex','F-type','Integrated SFP+ DAC'];
  const jackets=['Standard indoor / no plenum requirement','Plenum-rated (CMP or appropriate listed equivalent)','No special jacket constraint specified'];
  const designs=[
    {name:'Office workstation upgrade',desc:'A 10GBASE-T desktop link runs through a normal office space. Channel length is 95 m; RJ45 switch and NIC ports. No unusual EMI and no air-handling space.',media:0,conn:0,jacket:0,reason:'Cat 6A balanced copper supports 10GBASE-T over a standards-compliant 100 m channel, with 8P8C ends. No special plenum constraint was specified.'},
    {name:'Warehouse backbone near motors',desc:'Two buildings in a warehouse complex are 150 m apart. High-power machinery creates electrical interference. Both switches have matching 10GBASE-SR SFP+ optical modules.',media:2,conn:1,jacket:2,reason:'OM3 multimode with duplex LC works for a 150 m 10GBASE-SR link using matched optics, while optical fiber is immune to electrical EMI pickup.'},
    {name:'Campus distribution',desc:'A 2 km 10 Gb/s uplink connects campus buildings. Both endpoints are provisioned with 10GBASE-LR optics and LC interfaces.',media:3,conn:1,jacket:2,reason:'10GBASE-LR is a single-mode optical Ethernet standard. OS2 SMF plus LC matches the described optical transceivers and distance.'},
    {name:'Cable modem installation',desc:'An internet provider delivers service on the existing residential RG-6 coax feed ending at a cable modem RF port.',media:4,conn:2,jacket:2,reason:'RG-6 coax with an F-type connector is the normal physical match to the stated cable-modem RF feed.'},
    {name:'Top-of-rack interconnect',desc:'Two nearby switches are 2 m apart and have compatible 10 Gb/s SFP+ ports. The goal is a short, factory-terminated high-speed connection without a separate optical patch lead.',media:5,conn:3,jacket:2,reason:'SFP+ direct-attach copper uses a short twinax assembly with integrated SFP+ ends; validate vendor/device compatibility.'},
    {name:'Plenum space horizontal run',desc:'You must install a 70 m 10GBASE-T Ethernet run through a building air-handling plenum. Both ports are RJ45, and shielding is not separately required.',media:0,conn:0,jacket:1,reason:'Choose Cat 6A UTP, RJ45 and cable listed for the plenum application (such as CMP in relevant jurisdictions). Local code governs exact rating.'}
  ];
  const faults=[
    {name:'The long copper run',description:'A new RJ45 Ethernet link to a far office negotiates intermittently. Cable pathway is approximately 132 m; switch logs show rising CRC errors.',data:[['Medium','Cat 6A copper'],['Observed','Intermittent link, CRC increments'],['Known good','Near-end 5 m patch cable works']],test:['Run a cable certifier to measure channel length and performance','Renew the workstation DHCP lease','Clear browser cache'],cause:['Copper channel exceeds the normal 100 m Ethernet limit','Incorrect DNS resolver','Wrong IP subnet mask'],fix:['Re-engineer to a compliant channel, add intermediate active equipment, or use suitable fiber','Raise the DHCP lease duration','Enable automatic MDI-X'],answers:[0,0,0],why:'Physical distance and attenuation are the differentiators. Start with cable certification, not TCP/IP configuration. Verify that the installed channel then meets its specification.'},
    {name:'Motor-induced drops',description:'The warehouse link works when machinery is off, but loses packets when an industrial motor starts. The unshielded cable parallels a power conduit.',data:[['Medium','UTP copper'],['Observed','Errors coincide with motor start'],['Known good','Link is stable when motor is off']],test:['Inspect routing and measure noise/cable performance','Flush ARP cache','Replace the default gateway'],cause:['Electromagnetic interference coupling into the copper link','A DNS record has expired','An IP address conflict'],fix:['Separate from power, use appropriate shielding/bonding or fiber','Reconfigure DNS forwarding','Increase MTU to 9000'],answers:[0,0,0],why:'The timing of the failures is decisive evidence for EMI. Optical fiber provides electrical isolation, and re-routing is often better than blind cable replacement.'},
    {name:'Dark fiber uplink',description:'A duplex LC fiber uplink shows loss of signal immediately after patch cords were changed. Transceivers are matched and both ports are enabled.',data:[['Port','10G optical duplex'],['Observed','LOS / link down'],['Change','Both LC patch leads were replaced']],test:['Check TX-to-RX fiber polarity and measure received light','Change DHCP reservations','Reset the spanning tree root'],cause:['TX/RX optical strands are reversed','Duplicate client IP','DNS service failure'],fix:['Correct fiber polarity so TX reaches the far-end RX and vice versa','Change the access VLAN','Adjust the routing metric'],answers:[0,0,0],why:'Duplex optical links need TX→RX in each direction. A newly changed patch path, matched optics and LOS make polarity the priority hypothesis.'},
    {name:'Low optical power',description:'An otherwise correct 10 Gb/s LC fiber run has poor optical receive power and growing errors. The LC end face was handled without protective caps.',data:[['Interface','Optical power below expected budget'],['Observed','Errors / occasional LOS'],['Change','Exposed fiber ferrule']],test:['Inspect and properly clean fiber ends, then measure optical power','Replace the DNS server','Assign a new MAC address'],cause:['Contaminated optical connector adds insertion loss','Duplicate VLAN identifiers','Wrong TCP port'],fix:['Clean with approved fiber inspection/cleaning process and retest optical levels','Restart DHCP','Replace Ethernet VLAN configuration'],answers:[0,0,0],why:'Contamination on a fiber ferrule raises loss. Never look into an active fiber; use appropriate inspection equipment, clean, then verify received power and error counters.'},
    {name:'A split-pair termination',description:'A cable wiremap reports continuity on all eight conductors, but a certification test flags split pairs and the link suffers errors at higher rates.',data:[['Continuity','All pins appear connected'],['Certifier','Split pair detected'],['Observed','Crosstalk and packet errors']],test:['Run a cable certifier capable of identifying split pairs and NEXT','Renew the IP address','Test web proxy settings'],cause:['Conductors were assigned without preserving correct twisted pair relationships','A route is missing','The switch MAC table is full'],fix:['Re-terminate following a complete T568A or T568B pairing scheme, preserving twist','Increase DNS TTL','Change the subnet mask'],answers:[0,0,0],why:'A basic continuity check can pass despite crossed pair membership. The twist pairing reduces near-end crosstalk; use a certifier for performance faults.'},
    {name:'Wrong optic on one end',description:'A newly installed fiber uplink stays down despite clean connectors. One switch uses 10GBASE-SR multimode optics; the other uses 10GBASE-LR single-mode optics.',data:[['End A','10GBASE-SR'],['End B','10GBASE-LR'],['Observed','No usable link']],test:['Inspect optics type, wavelength, fiber type, and received power at both ends','Run traceroute between clients','Restart the application server'],cause:['Incompatible transceiver standards/media are installed','A VLAN native mismatch is confirmed','The DHCP server is offline'],fix:['Install a matched optical link design with compatible modules and fiber','Change default gateway settings','Enable jumbo frames'],answers:[0,0,0],why:'SFP+ describes a form factor, not an optical interoperability guarantee. SR and LR have different media and wavelength requirements.'}
  ];
  const questions=[
    {q:'A switch has a 10GBASE-T port and a workstation is 95 m away. Which new permanent cabling choice best supports a standards-compliant 10 Gb/s copper channel?',opts:['Cat 6A','RG-6 coax','OS2 fiber with no optics','Cat 3'],a:0,why:'Cat 6A supports 10GBASE-T to 100 m using appropriate components.',wrong:['','RG-6 is for coax/RF, not RJ45 10GBASE-T.','Fiber needs optical ports/transceivers, not a copper-only 10GBASE-T port.','Cat 3 lacks the performance required.'],tag:'Media and speed'},
    {q:'Which connector most commonly terminates RG-6 coax for a residential cable modem?',opts:['LC','F-type','RJ11','MPO'],a:1,why:'F-type is a threaded coax connector commonly used with RG-6.',wrong:['LC is a fiber connector.','','RJ11 is associated with telephone-style connections.','MPO aggregates multiple optical fibers.'],tag:'Connector identification'},
    {q:'A 3 km campus link is fitted with 10GBASE-LR optics. Which medium is normally appropriate?',opts:['Cat 6 UTP','OM3 multimode for any range','OS2 single-mode fiber','RG-58 coax'],a:2,why:'10GBASE-LR uses single-mode fiber for kilometer-scale reach.',wrong:['Copper twisted-pair reach is far shorter.','OM3 with SR is distance-limited; LR optics specify single-mode.','','Coax cannot attach directly to the indicated optics.'],tag:'Fiber selection'},
    {q:'Which pair positions exchange between T568A and T568B?',opts:['Blue and brown','Orange and green','Blue and green','Brown and orange'],a:1,why:'Green and orange occupy different pin groups on T568A vs T568B; blue and brown remain in place.',wrong:['Blue/brown pairs do not swap.','','Blue is unchanged.','Brown is unchanged.'],tag:'T568 wiring'},
    {q:'A CAT cable has all conductors in continuity, yet a certifier reports split pairs. What is the likely impact?',opts:['Improved EMI shielding','Crosstalk and poor signal integrity','An automatic fiber mode change','A DNS lookup failure'],a:1,why:'Wrong pair membership breaks balanced twisted-pair properties even when endpoint pin continuity looks acceptable.',wrong:['Splitting pairs worsens noise rejection.','','Copper does not become optical.','The observed fault is physical, not a DNS service issue.'],tag:'Termination'},
    {q:'A 10 Gb/s, 2 m connection between compatible SFP+ switch ports should avoid separate optical patch cords. Best fit?',opts:['SFP+ direct attach copper','RJ11 phone cable','RG-6 coax','SC patch cable with no modules'],a:0,why:'A factory-terminated SFP+ DAC/twinax assembly is designed for short, compatible high-speed links.',wrong:['','RJ11 cannot provide this link.','Coax is mismatched.','Bare fiber connector without transceivers cannot meet the requirement.'],tag:'DAC and SFP'},
    {q:'Why would an installer choose plenum-rated cable in an air-handling space?',opts:['It increases Ethernet throughput','It meets applicable fire/smoke performance requirements','It replaces the need for a switch','It makes copper immune to EMI'],a:1,why:'Cable jacket listings address fire/smoke behavior for the installation environment, subject to local code.',wrong:['Jacket rating does not create higher network speed.','','It does not provide switching.','Fire rating does not negate EMI.'],tag:'Cable jacket'},
    {q:'A duplex LC fiber uplink loses signal after patching. Which physical issue should be checked early?',opts:['Client DNS cache','TX/RX polarity','DHCP lease length','Wi-Fi channel width'],a:1,why:'TX at each optical endpoint must reach RX at the other end.',wrong:['DNS cannot explain physical LOS.','','DHCP cannot explain physical LOS.','Wi-Fi configuration is unrelated.'],tag:'Fiber polarity'},
    {q:'An optical port reports low receive power immediately after an unprotected ferrule was handled. Most useful first action?',opts:['Clean/inspect optical connectors with approved tools','Replace DHCP scope','Increase cable MTU','Force 100 Mb/s Ethernet copper mode'],a:0,why:'Contaminated optical ferrules cause attenuation and poor received optical power.',wrong:['','DHCP cannot change optical received power.','MTU does not eliminate optical insertion loss.','Copper mode cannot correct contaminated fiber.'],tag:'Fiber loss'},
    {q:'A user reports links dropping whenever a motor starts beside unshielded cabling. Which mechanism most closely fits?',opts:['Electromagnetic interference','Network address translation','Time synchronization','TTL expiration'],a:0,why:'Electromagnetic noise can couple into copper near high-power machinery; reroute, properly shield, or use fiber.',wrong:['','NAT cannot explain the motor correlation.','NTP is not the physical mechanism.','DNS TTL is unrelated.'],tag:'Signal degradation'},
    {q:'Which fiber connector is commonly used for high-density multifiber trunks?',opts:['BNC','MPO','RJ45','F-type'],a:1,why:'MPO is a multi-fiber push-on optical connector commonly used in dense fiber links.',wrong:['BNC terminates coax.','','RJ45 is modular copper Ethernet.','F-type terminates coax.'],tag:'Connector identification'},
    {q:'What does attenuation mean in cabling?',opts:['Loss of signal strength along the path','A local MAC address conflict','The number of network switches','Packets arriving out of order'],a:0,why:'Attenuation is signal loss over a physical medium, commonly characterized in dB.',wrong:['','MAC addressing is Layer 2 logic.','Switch count is not a definition of attenuation.','Packet ordering is not attenuation.'],tag:'Signal degradation'},
    {q:'Which tool is best to verify a new horizontal copper installation meets its category performance requirements?',opts:['Cable certifier','Ping only','DNS lookup','Tone probe only'],a:0,why:'A category cable certifier measures performance such as NEXT, insertion loss and wiremap against the selected limit.',wrong:['','Ping tests connectivity, not a standards-compliant cable certification.','DNS tests name resolution.','A toner helps trace cable location; it does not certify performance.'],tag:'Tools and testing'},
    {q:'Which statement about QSFP is most accurate?',opts:['It is one fixed 10 Mb/s fiber protocol','It is a family of quad-lane pluggable module form factors','It is an RJ45 termination standard','It denotes plenum-rated cable'],a:1,why:'QSFP denotes a pluggable form-factor family; capabilities depend on specific generation and module.',wrong:['QSFP has no universal single data rate.','','It is not an RJ45 pinout.','It does not describe jacket fire rating.'],tag:'Transceivers'},
    {q:'In a legacy network with no Auto-MDI-X, a cable with T568A at one end and T568B at the other is traditionally used as what?',opts:['Straight-through Ethernet','Copper crossover cable','Fiber patch cable','Console rollover cable'],a:1,why:'A/B on opposite ends is the traditional two-pair Ethernet crossover wiring pattern. Modern ports often use Auto-MDI-X.',wrong:['Straight-through uses the same T568 standard at both ends.','','Fiber does not use RJ45 pins.','Rollover reverses pin positions, not simply A/B pair swap.'],tag:'T568 wiring'},
    {q:'A switch is configured with 10GBASE-SR optics. Which matching link is most appropriate for a 120 m indoor run?',opts:['Cat 6 UTP to the optical port','OM3 multimode with compatible LC optics','RG-6/F-type','OS2 with an unrelated LR transceiver at the far end'],a:1,why:'10GBASE-SR operates with multimode fiber; OM3 supports a 120 m application with matched optics.',wrong:['Copper cannot mate with LC optics.','','Coax is an incompatible transmission system.','Mixing SR and LR optics is not a supported matched optical design.'],tag:'Media and optics'},
    {q:'A 6-position modular telephone connector is compared with an 8-position Ethernet-style modular connector. Which is the telephone option?',opts:['RJ11','SC','MPO','SFP+'],a:0,why:'RJ11 is associated with telephone connections, often using a 6-position modular connector.',wrong:['','SC is fiber.','MPO is multifiber optical.','SFP+ is a module form factor.'],tag:'Connector identification'},
    {q:'The link light remains off despite clean ends and functional ports. One side uses multimode SR optics and the other long-reach LR optics. Most likely root cause?',opts:['SFP+ module standards mismatch','A malformed DNS A record','Incorrect web proxy settings','Wrong IPv4 default gateway'],a:0,why:'The optical link must have compatible transceivers, wavelengths, fiber type, and optical budget at both ends.',wrong:['','DNS cannot restore the physical link.','Proxy is at a higher layer.','Gateway configuration cannot explain no physical link light.'],tag:'Transceivers'}
  ];
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch(e){return {}}};
  let progress=Object.assign({attempts:0,correct:0,weak:{},completed:{}},read());
  let current='home',mediumId='utp',connectorId='rj45';
  let wiring={task:'straight',end:0,selected:'WO',A:Array(8).fill(null),B:Array(8).fill(null),graded:null,guide:false};
  let dIndex=0,dSelection={media:'',conn:'',jacket:''},dGrade=null,dTries=0;
  let fIndex=0,fStep=0,fAnswers=[],fGrade=null;
  let exam={mode:null,index:0,answers:[],confidence:[],finished:false,seen:false};
  const $=s=>document.querySelector(s);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(progress))}catch(e){};renderStats()};
  const record=(id,correct)=>{progress.attempts++;if(correct){progress.correct++;delete progress.weak[id]}else progress.weak[id]=(progress.weak[id]||0)+1;save()};
  const btn=(label,action,cls='action')=>'<button class="'+cls+'" data-action="'+action+'">'+label+'</button>';
  const svg=(body,view='0 0 460 230')=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+view+'" role="img" aria-label="Technical diagram">'+body+'</svg>';
  const box=(x,y,w,h,fill,stroke='#628699',r=8)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"/>';
  const label=(x,y,t,size=14,color='#dceff3')=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" font-family="ui-sans-serif,Arial" font-size="'+size+'" text-anchor="middle">'+esc(t)+'</text>';
  const line=(x1,y1,x2,y2,color='#81d9c5',width=4)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round"/>';
  const color=(id)=>{const p=palette.find(p=>p.id===id);return p?p.css:'#213e54'};
  const mediaArt=(id)=>{
    let b='';
    if(id==='utp'||id==='stp'){
      b+=box(36,38,390,150,'#122a3f','#456577',30);
      if(id==='stp')b+=box(54,54,354,118,'#84989c','#d7f4f1',25)+box(66,66,330,95,'#142c42','#507082',18);
      else b+=box(53,53,354,120,'#1d3a53','#4d7e85',24);
      const pairCols=['#ea9445','#48ca96','#558eea','#b47d64'];
      for(let p=0;p<4;p++){const x=108+p*78;
        for(let i=0;i<8;i++){const yy=69+i*12,xx=x+Math.sin(i*1.8)*13;
          b+=line(xx,yy,xx+Math.sin((i+1)*1.8)*8,yy+10,pairCols[p],6);
          b+=line(xx+16,yy,xx+16-Math.sin((i+1)*1.8)*8,yy+10,'#f0f0e6',6);
        }
      }
      b+=label(230,208,id==='stp'?'TWISTED PAIRS + FOIL SHIELD':'4 BALANCED TWISTED PAIRS',16);
    }else if(id==='smf'||id==='mmf'){
      b+='<circle cx="230" cy="113" r="93" fill="#29445b" stroke="#8ca5b3" stroke-width="8"/>';
      b+='<circle cx="230" cy="113" r="'+(id==='smf'?53:70)+'" fill="#8ee8d6" opacity=".75"/>';
      b+='<circle cx="230" cy="113" r="'+(id==='smf'?13:37)+'" fill="#ffda8c" stroke="#fff7d6" stroke-width="3"/>';
      b+=line(230,113,340,38,'#f9dda4',2)+label(378,27,'CORE',13);b+=label(230,222,id==='smf'?'SMALL CORE • ONE MODE':'LARGER CORE • MULTIPLE MODES',14);
    }else if(id==='coax'){
      b+='<circle cx="230" cy="113" r="95" fill="#1e3348" stroke="#708fa1" stroke-width="9"/>';
      b+='<circle cx="230" cy="113" r="75" fill="#c9cfca" stroke="#eff1e6" stroke-width="8"/>';
      b+='<circle cx="230" cy="113" r="51" fill="#dae7d8" stroke="#8c9b93" stroke-width="5"/>';
      b+='<circle cx="230" cy="113" r="19" fill="#cf985e" stroke="#ffe2b4" stroke-width="4"/>';
      b+=label(230,223,'CORE / DIELECTRIC / SHIELD / JACKET',13);
    }else{
      b+=box(57,80,345,65,'#26475a','#5b7f88',20)+line(99,113,363,113,'#dcad75',12);
      b+=box(32,69,79,90,'#718b90','#ccf3d9',8)+box(348,69,79,90,'#718b90','#ccf3d9',8);
      for(let x of [43,360])for(let j=0;j<4;j++)b+=box(x+8+j*11,92,7,40,'#d9b979','#eeda8a',1);
      b+=label(230,203,'FACTORY TERMINATED TWINAX',15);
    }
    return svg(b);
  };
  const connectorArt=id=>{
    let b='';
    if(id==='rj45'||id==='rj11'){
      const n=id==='rj45'?8:6;
      b+=box(92,36,276,151,'#a7c6d0','#e3faff',16)+box(124,55,210,112,'#375166','#80aab1',11);
      for(let i=0;i<n;i++){let x=139+i*(187/(n-1));b+=box(x,58,13,79,'#c69f62','#fbe5b8',2)}
      b+='<path d="M168 187 L292 187 L282 205 L178 205Z" fill="#7eabaf" stroke="#c0e1e1"/>';
      b+=label(230,224,n+' CONTACT POSITIONS',12);
    }else if(id==='lc'||id==='sc'||id==='st'||id==='mpo'){
      if(id==='mpo'){
        b+=box(78,55,305,122,'#2a3849','#8fa4b8',18);b+=box(108,78,245,76,'#c9d0d2','#effdfd',7);
        for(let i=0;i<12;i++)b+='<circle cx="'+(128+i*19)+'" cy="115" r="6" fill="#768d97" stroke="#435968"/>';
        b+=label(230,210,'MULTI-FIBER ARRAY',13);
      }else if(id==='st'){
        b+='<circle cx="230" cy="109" r="69" fill="#a5b7b9" stroke="#e3f2ec" stroke-width="8"/>';
        b+='<circle cx="230" cy="109" r="39" fill="#4c6770" stroke="#d6e2df" stroke-width="10"/>';
        b+='<circle cx="230" cy="109" r="13" fill="#e5ece8"/>';
        b+=label(230,212,'BAYONET LOCK',13);
      }else{
        const lc=id==='lc';const start=lc?91:153;const count=lc?2:1;
        for(let i=0;i<count;i++){const x=start+i*154;
          b+=box(x,60,lc?123:155,97,'#dbe6e3','#f4ffff',8);
          b+=box(x+24,85,lc?75:105,51,'#547180','#87adb2',4);
          b+='<circle cx="'+(x+(lc?61:78))+'" cy="111" r="16" fill="#f2f6f2" stroke="#a1b0a9" stroke-width="5"/>';
        }b+=label(230,213,lc?'DUPLEX / TX + RX':'SQUARE PUSH-PULL',13);
      }
    }else if(id==='bnc'||id==='f'){
      b+=box(87,88,265,60,'#b0b7ba','#f0f7ed',18);
      b+='<circle cx="352" cy="118" r="35" fill="#9da7a9" stroke="#e9e8da" stroke-width="10"/>';
      b+='<circle cx="352" cy="118" r="12" fill="#ae7c49"/>';
      if(id==='bnc'){b+=box(116,72,40,90,'#d2d7d6','#f8f9f7',4);b+=label(230,210,'BAYONET COAX',13)}
      else{for(let i=0;i<5;i++)b+=line(128+i*33,84,142+i*33,151,'#76888a',3);b+=label(230,210,'THREADED COAX',13)}
    }else{
      const wider=id==='qsfp';
      b+=box(wider?63:93,75,wider?340:280,87,'#8ca2a5','#d5e9dc',7);
      b+=box(wider?95:121,94,wider?265:225,48,'#2f4755','#7ea0a1',5);
      for(let i=0;i<(wider?12:8);i++)b+=box((wider?111:138)+i*(wider?18:24),125,10,14,'#dbbd77','#f5e4ad',1);
      b+=label(230,207,wider?'QUAD-LANE MODULE FAMILY':'PLUGGABLE MODULE',13);
    }
    return svg(b);
  };
  const heroSvg=()=>{
    let b=box(60,53,327,176,'#4f8391','#b8e3de',20)+box(81,72,287,132,'#cbece0','#f0fffc',12);
    const cols=['#fff8e8','#eb9748','#fff8e8','#5791f1','#fff8e8','#38c58d','#fff8e8','#b88660'];
    for(let i=0;i<8;i++){const x=97+i*32;
      b+=box(x,34,24,135,cols[i],cols[i]==='#fff8e8'?'#adb9b0':'#ffffff35',6);
      if(i%2===0){const stripe=['#ea934e','#48be8b','#5a8ddd','#b98865'][i/2];b+=box(x+16,34,7,135,stripe,stripe,2)}
      b+=box(x,76,24,26,'#d7b677','#f6e3a4',3);
    }
    b+=box(82,177,286,32,'#7cabb1','#d2f7f2',5);
    b+=label(224,260,'EIGHT PINS • TWO STANDARDS • ONE LOGIC',16,'#7af4d4');
    return svg(b,'0 0 455 285');
  };
  const renderStats=()=>{
    $('#total-solved').textContent=progress.correct;
    $('#total-attempts').textContent=progress.attempts;
    $('#weak-total').textContent=Object.keys(progress.weak).length;
    $('#side-stat').textContent=progress.attempts+' attempts · '+progress.correct+' correct';
    $('#side-progress').style.width=(progress.attempts?Math.round(progress.correct/progress.attempts*100):0)+'%';
  };
  const toast=msg=>{const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2300)};
  const go=page=>{
    current=page;
    document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='page-'+page));
    document.querySelectorAll('#nav button').forEach(e=>e.classList.toggle('active',e.dataset.page===page));
    $('#crumb-current').textContent=({'home':'OVERVIEW','atlas':'CABLE ATLAS','wire':'WIRING BENCH','design':'LINK DESIGN','fault':'FAULT FINDER','exam':'EXAM ARENA','map':'FUNCTIONAL MAP'})[page];
    if(page==='atlas')renderAtlas();if(page==='wire')renderWire();if(page==='design')renderDesign();if(page==='fault')renderFault();if(page==='exam')renderExam();if(page==='map')renderMap();
    window.scrollTo({top:0,behavior:'instant'});
  };
  const renderAtlas=()=>{
    const m=mediums.find(x=>x.id===mediumId),c=connectors.find(x=>x.id===connectorId);
    $('#atlas-view').innerHTML='<div class="panel"><div class="panel-title"><h2>01 · Transmission media</h2><span class="tiny muted">Compare by construction, use, and constraint</span></div><div class="tabs">'+mediums.map(x=>'<button class="tab '+(x.id===mediumId?'active':'')+'" data-medium="'+x.id+'">'+x.name+'</button>').join('')+'</div><div class="grid-2"><div class="visual-stage">'+mediaArt(m.id)+'</div><div><div class="kicker">'+m.kicker+'</div><h2 style="font-size:27px;margin:7px 0">'+m.name+'</h2><p>'+m.subtitle+'</p><div class="fact-list">'+m.facts.map(f=>'<div class="fact"><b>'+f[0]+'</b><span>'+f[1]+'</span></div>').join('')+'</div></div></div><div class="exam-tip"><b>EXAM TRAP</b> · '+m.tip+'</div></div>'+
    '<div class="panel" style="margin-top:15px"><div class="panel-title"><h2>02 · Connector and transceiver visual gallery</h2><span class="tiny muted">Select a connector to inspect it</span></div><div class="connector-grid">'+connectors.map(x=>'<button class="connector-card '+(x.id===connectorId?'selected':'')+'" data-connector="'+x.id+'">'+connectorArt(x.id)+'<b>'+x.name+'</b><small>'+((x.id==='sfp'||x.id==='qsfp')?'Module form factor':'Physical connection')+'</small></button>').join('')+'</div><div class="grid-2"><div class="visual-stage slim">'+connectorArt(c.id)+'</div><div><div class="kicker">SELECTED ITEM</div><h2>'+c.name+'</h2><p>'+c.desc+'</p><div class="exam-tip"><b>EXAM TRAP</b> · '+c.trap+'</div></div></div></div>'+
    '<div class="notice">Mental rule: <b>environment + distance + throughput</b> determines the medium; <b>interfaces + transceivers</b> determine the compatible connector. A connector shape alone does not tell you link speed.</div>';
  };
  const wireGoal=()=>wiring.task==='A'?[A,A]:wiring.task==='cross'?[A,B]:[B,B];
  const wireStatus=(arr,expected)=>arr.every((p,i)=>p===expected[i]);
  const renderWire=()=>{
    const goals=wireGoal(),isA=wiring.end===0;
    const end=isA?wiring.A:wiring.B,expected=goals[wiring.end];
    const taskChoices=[['A','T568A / T568A'],['B','T568B / T568B'],['straight','Straight-through (B/B)'],['cross','Crossover (A/B)']];
    $('#wire-view').innerHTML='<div class="wire-layout"><div class="panel"><div class="wire-head"><h2 style="margin:0">Interactive 8-pin connectors</h2><span class="tag">VIEW: FRONT OF PLUG · CONTACTS UP · LATCH AWAY</span></div><div class="tabs" style="margin-top:15px">'+taskChoices.map(x=>'<button class="tab '+(wiring.task===x[0]?'active':'')+'" data-wire-task="'+x[0]+'">'+x[1]+'</button>').join('')+'</div><div class="tabs"><button class="tab '+(isA?'active':'')+'" data-wire-end="0">END A</button><button class="tab '+(!isA?'active':'')+'" data-wire-end="1">END B</button><button class="chip '+(wiring.guide?'selected':'')+'" data-action="wire-guide">'+(wiring.guide?'Hide':'Show')+' reference</button></div><div class="visual-stage slim" style="min-height:170px">'+wirePreview()+'</div><div class="pin-grid">'+end.map((p,i)=>'<button aria-label="Pin '+(i+1)+', '+(p?palette.find(z=>z.id===p).name:'unassigned')+'" class="pin '+(wiring.graded?(p===expected[i]?'right':'wrong'):'')+'" data-pin="'+i+'"><span class="pin-num">'+(i+1)+'</span><span class="pin-wire" style="--wire:'+(p?color(p):'#29445a')+'"></span><span>'+(p||'—')+'</span></button>').join('')+'</div><div class="tiny muted">Select a color at right, then a pin. You can click a filled pin to overwrite it. Repeat for End B.</div>'+(wiring.guide?'<div class="notice"><b>Reference:</b> End A = '+goals[0].map(x=>palette.find(p=>p.id===x).name).join(' · ')+'<hr style="border-color:#34675a"><b>End B = </b>'+goals[1].map(x=>palette.find(p=>p.id===x).name).join(' · ')+'</div>':'')+'</div>'+
    '<div class="panel"><h2>Conductor palette</h2><p class="tiny">A correctly wired connector preserves four twisted-pair relationships. Arrange the <b>contacts facing you, latch away</b>, pin 1 at left.</p><div class="color-palette">'+palette.map(p=>'<button class="swatch '+(wiring.selected===p.id?'selected':'')+'" data-swatch="'+p.id+'"><i style="--wire:'+p.css+'"></i>'+p.name+'</button>').join('')+'</div><div class="callout"><b>Remember:</b> Orange ↔ Green exchange between T568A and T568B. Blue remains on 4/5; brown remains on 7/8. Modern Auto-MDI-X often removes the need for crossover cables.</div><div class="final-actions">'+btn('Grade both ends','wire-grade','primary')+btn('Clear wiring','wire-clear')+'</div>'+(wiring.graded?'<div class="feedback '+(wiring.graded.good?'ok':'bad')+'"><b>'+ (wiring.graded.good?'Correct wiring!':'Check your pair order')+'</b><p>'+wiring.graded.message+'</p></div>':'')+'</div></div>';
  };
  const wirePreview=()=>{
    const arr=wiring.end===0?wiring.A:wiring.B;
    let b=box(27,24,406,150,'#a7c3c6','#dffaf4',20)+box(44,36,370,120,'#284456','#779f9f',13);
    arr.forEach((x,i)=>{let xx=58+i*44;b+=box(xx,47,34,107,x?((palette.find(p=>p.id===x).id.startsWith('W'))?'#eeeae0':color(x)):'#203546','#d2eeea',4);
      if(x&&x.startsWith('W')){b+=box(xx+25,47,9,107,x==='WO'?'#ec8b39':x==='WG'?'#41c68a':x==='WBL'?'#538def':'#ad7b57','#d5e5ed',2)}
      b+=box(xx+4,48,27,29,'#d1ac67','#ffdf90',2);
      b+=label(xx+17,193,String(i+1),12);
    });
    return svg(b,'0 0 460 210');
  };
  const wireGrade=()=>{
    const goals=wireGoal();const good=wireStatus(wiring.A,goals[0])&&wireStatus(wiring.B,goals[1]);
    const count=[wiring.A,wiring.B].reduce((n,a,j)=>n+a.filter((v,i)=>v===goals[j][i]).length,0);
    wiring.graded={good,message:good?'Both 8-pin ends match the required standard. Explain why the swapped orange/green pairs matter in a crossover.':count+'/16 positions are correct. Switch between End A and End B to inspect highlighted pins. Pair integrity matters more than just continuity.'};
    record('wiring-'+wiring.task,good);renderWire();
  };
  const renderDesign=()=>{
    const d=designs[dIndex];
    const select=(name,opts,prompt)=>'<label class="form-field">'+prompt+'<select data-design="'+name+'"><option value="">Choose an option...</option>'+opts.map((t,i)=>'<option value="'+i+'" '+(String(dSelection[name])===String(i)?'selected':'')+'>'+t+'</option>').join('')+'</select></label>';
    $('#design-view').innerHTML='<div class="grid-2"><div class="panel"><div class="kicker">SCENARIO '+(dIndex+1)+' / '+designs.length+'</div><h2 class="scenario-title">'+d.name+'</h2><p class="scenario-description">'+d.desc+'</p><div class="visual-stage">'+linkVisual(dIndex)+'</div><div class="callout"><b>Exam reasoning:</b> Identify the <b>hard constraints</b> before selecting a familiar technology. A feasible answer must satisfy every stated requirement.</div></div><div class="panel"><div class="panel-title"><h2>Specify the link</h2><span class="tag">3 DECISIONS</span></div><div class="select-row">'+select('media',linkMedia,'1 · Physical medium')+'</div><div class="select-row">'+select('conn',linkConnect,'2 · Connector / interface')+'</div><div class="select-row">'+select('jacket',jackets,'3 · Cable environment / jacket')+'</div><div class="final-actions">'+btn('Check design','design-grade','primary')+btn('Next scenario →','design-next')+'</div>'+(dGrade?'<div class="feedback '+(dGrade.good?'ok':'bad')+'"><b>'+ (dGrade.good?'All constraints satisfied.':'One or more constraints not met.')+'</b><p>'+dGrade.text+'</p>'+(dGrade.good?'':'<p><b>Reconsider:</b> Which requirement is decisive: interface, distance, interference, or jacket rating?</p>')+'</div>':'')+'</div></div>';
  };
  const linkVisual=i=>{
    const isOpt=i===1||i===2,coax=i===3,dac=i===4;
    let b=box(23,54,104,88,'#284659','#5e9dad',9)+box(333,54,104,88,'#284659','#5e9dad',9);
    b+=box(52,87,50,20,'#5bd3b3','#b0ffe6',4)+box(359,87,50,20,'#5bd3b3','#b0ffe6',4);
    b+=line(129,98,331,98,isOpt?'#e9b866':coax?'#dfdde6':dac?'#97b3c9':'#67e3c4',isOpt?5:9);
    if(isOpt){for(let j=0;j<5;j++)b+='<circle cx="'+(165+j*36)+'" cy="98" r="4" fill="#ffda80"/>'}
    b+=label(77,172,i===3?'MODEM':i===0||i===5?'SWITCH':'END A',14)+label(384,172,i===3?'ISP FEED':i===0||i===5?'WORKSTATION':'END B',14);
    b+=label(230,49,['95m RJ45','150m / EMI','2km / LR optics','RG-6 RF feed','2m / SFP+','70m / PLENUM'][i],14,'#fbd795');
    b+=label(230,213,isOpt?'OPTICAL MODULE COMPATIBILITY':dac?'SHORT DIRECT ATTACH ASSEMBLY':coax?'RF TERMINATION':'COPPER STANDARD + ENVIRONMENT',12);
    return svg(b);
  };
  const gradeDesign=()=>{
    const d=designs[dIndex];
    if(dSelection.media===''||dSelection.conn===''||dSelection.jacket===''){toast('Select all three constraints first.');return}
    const good=Number(dSelection.media)===d.media&&Number(dSelection.conn)===d.conn&&Number(dSelection.jacket)===d.jacket;
    record('design-'+dIndex,good);
    if(!good)dTries++;
    dGrade={good,text:good?d.reason:dTries>1?'Review the target combination: '+linkMedia[d.media]+' + '+linkConnect[d.conn]+' + '+jackets[d.jacket]+'. '+d.reason:'Your design conflicts with at least one requirement. Check the link distance, the available port and optic type, and the installation environment. Revise the choices and retest.'};
    renderDesign();
  };
  const renderFault=()=>{
    const f=faults[fIndex],stageNames=['Select the best confirming test','Identify the most likely root cause','Choose the minimal correction'];
    const opts=fStep===0?f.test:fStep===1?f.cause:f.fix;
    const rotation=(fIndex+fStep+1)%3;
    const order=[0,1,2].slice(rotation).concat([0,1,2].slice(0,rotation));
    let body='<div class="grid-2"><div class="panel"><div class="kicker">FAULT '+(fIndex+1)+' / '+faults.length+'</div><h2 class="scenario-title">'+f.name+'</h2><p class="scenario-description">'+f.description+'</p><div class="visual-stage slim">'+faultVisual(fIndex)+'</div><table class="data-table"><tbody>'+f.data.map(x=>'<tr><th>'+x[0]+'</th><td>'+x[1]+'</td></tr>').join('')+'</tbody></table><div class="callout">Hypothesis → evidence → safe correction → verification. Do not make unrelated Layer 3 changes for a Layer 1 symptom.</div></div><div class="panel"><div class="steps">'+['TEST','CAUSE','FIX'].map((t,i)=>'<span class="step '+(i===fStep?'active':'')+'">'+(i+1)+' · '+t+'</span>').join('')+'</div>';
    if(fGrade){const ok=fGrade.good;body+='<h2>'+(ok?'Fault isolated':'Review the evidence')+'</h2><div class="feedback '+(ok?'ok':'bad')+'"><b>'+(fGrade.score)+'/3 correct decisions</b><p>'+f.why+'</p></div><div class="reason-block"><h3>Correct diagnostic chain</h3><p><b>Test:</b> '+f.test[f.answers[0]]+'</p><p><b>Cause:</b> '+f.cause[f.answers[1]]+'</p><p><b>Fix:</b> '+f.fix[f.answers[2]]+'</p><p><b>Verify:</b> link status, interface errors, signal performance and client connectivity after the targeted correction.</p></div><div class="final-actions">'+btn('Repeat this fault','fault-repeat')+btn('Next fault →','fault-next','primary')+'</div>'}
    else{body+='<h2>'+stageNames[fStep]+'</h2><p class="tiny muted">'+(fStep===0?'Choose what would confirm or reject a physical-layer hypothesis.':fStep===1?'Use the symptoms and selected test to infer the cause.':'Make the smallest appropriate correction, then verify.')+'</p><div class="choice-list">'+order.map((orig,i)=>'<button class="choice '+(fAnswers[fStep]===orig?'chosen':'')+'" data-fault-choice="'+orig+'"><span class="letter">'+String.fromCharCode(65+i)+'</span>'+opts[orig]+'</button>').join('')+'</div><div class="final-actions">'+btn(fStep===2?'Complete diagnosis':'Continue →','fault-advance','primary')+'</div>';}
    body+='</div></div>';$('#fault-view').innerHTML=body;
  };
  const faultVisual=i=>{
    let b=box(21,62,97,91,'#29475c','#68aeb1',10)+box(342,62,97,91,'#29475c','#68aeb1',10);
    b+=box(48,92,48,24,'#68d8bb','#a9fbe9',5)+box(363,92,48,24,'#68d8bb','#a9fbe9',5);
    b+=line(122,104,338,104,i===2||i===3||i===5?'#ffc778':'#51dfb3',8);
    if(i===0)b+=label(230,73,'132 m →',21,'#ffb0aa');
    if(i===1){for(let j=0;j<4;j++)b+=line(183+j*22,82,204+j*22,126,'#ed9866',2);b+=label(230,73,'EMI',16,'#ffca86')}
    if(i===2)b+=label(230,73,'TX ↔ TX ?',16,'#f7bd6e');
    if(i===3)b+='<circle cx="230" cy="104" r="24" fill="#916641" stroke="#ffe59b" stroke-width="3"/>';
    if(i===4)b+=label(230,73,'SPLIT PAIR',16,'#ffc880');
    if(i===5)b+=label(230,73,'SR ≠ LR',19,'#ffc880');
    b+=label(230,210,'PHYSICAL PATH · LAYER 1',15);
    return svg(b);
  };
  const faultAdvance=()=>{
    if(fAnswers[fStep]===undefined){toast('Choose one answer before continuing.');return}
    if(fStep<2){fStep++;renderFault();return}
    const f=faults[fIndex];const score=fAnswers.filter((a,i)=>a===f.answers[i]).length;fGrade={score,good:score===3};
    record('fault-'+fIndex,score===3);renderFault();
  };
  const examStart=mode=>{exam={mode,index:0,answers:[],confidence:[],finished:false,seen:false};renderExam()};
  const renderExam=()=>{
    let body='';
    if(!exam.mode){
      body='<div class="panel quiz-wrap"><div class="kicker">CHOOSE YOUR PRACTICE MODE</div><h2>How will you retrieve the knowledge?</h2><div class="grid-2"><div class="panel"><h3>Guided practice</h3><p>Get item-level explanation and distractor analysis after each answer. Best for learning new relationships.</p>'+btn('Start guided practice','exam-guided','primary')+'</div><div class="panel"><h3>Independent exam</h3><p>Answer '+questions.length+' original questions without seeing correctness or explanations until submission.</p>'+btn('Start independent exam','exam-independent','primary')+'</div></div><div class="notice"><b>Training note:</b> These are original educational items, not real CompTIA exam questions or a score prediction. A wrong answer is tagged for retrieval practice.</div></div>';
    }else if(exam.finished){
      const right=exam.answers.reduce((n,a,i)=>n+(a===questions[i].a?1:0),0),pct=Math.round(right/questions.length*100);
      body='<div class="panel quiz-wrap"><div class="kicker">DEBRIEF · '+exam.mode.toUpperCase()+'</div><h2>Exam attempt complete</h2><div class="summary-score">'+pct+'%</div><p>'+right+' of '+questions.length+' correct. Focus on the reasoning for misses, not only the percent correct.</p><div class="final-actions">'+btn('Restart guided','exam-guided','primary')+btn('Retake independent','exam-independent')+'</div><h2 style="margin-top:25px">Rationale and distractor review</h2>'+questions.map((q,i)=>'<div class="review-item"><div class="kicker">QUESTION '+(i+1)+' · '+q.tag+'</div><h4>'+q.q+'</h4><p>Your response: <b style="color:'+(exam.answers[i]===q.a?'#a7f59a':'#ff9f9f')+'">'+(q.opts[exam.answers[i]]||'Not answered')+'</b></p><p><b>Correct:</b> '+q.opts[q.a]+'. '+q.why+'</p>'+(exam.answers[i]!==q.a?'<p><b>Why your answer fails:</b> '+(q.wrong[exam.answers[i]]||'Review the defining requirement.')+'</p>':'')+'</div>').join('')+'</div>';
    }else{
      const i=exam.index,q=questions[i],selected=exam.answers[i],isGuided=exam.mode==='guided',show=isGuided&&exam.seen;
      const offset=(i*3+1)%4;
      const qOrder=[0,1,2,3].slice(offset).concat([0,1,2,3].slice(0,offset));
      body='<div class="panel quiz-wrap"><div class="quiz-toolbar"><span class="kicker">QUESTION '+(i+1)+' / '+questions.length+' · '+q.tag.toUpperCase()+'</span><span class="tag">'+(isGuided?'GUIDED':'INDEPENDENT')+'</span></div><div class="quiz-progress"><span style="width:'+Math.round((i+1)/questions.length*100)+'%"></span></div><h2 class="scenario-title">'+q.q+'</h2><div class="choice-list">'+qOrder.map((orig,j)=>'<button class="choice '+(selected===orig?'chosen':'')+' '+(show?(orig===q.a?'correct':orig===selected?'wrong':''):'')+'" data-exam-choice="'+orig+'" '+(show?'disabled':'')+'><span class="letter">'+String.fromCharCode(65+j)+'</span>'+q.opts[orig]+'</button>').join('')+'</div><div class="select-row"><div class="tiny muted">Confidence: </div><button class="chip '+(exam.confidence[i]==='sure'?'selected':'')+'" data-confidence="sure">Sure</button><button class="chip '+(exam.confidence[i]==='unsure'?'selected':'')+'" data-confidence="unsure">Unsure</button></div>';
      if(show){body+='<div class="feedback '+(selected===q.a?'ok':'bad')+'"><b>'+(selected===q.a?'Correct.':'Not quite.')+'</b><p>'+q.why+'</p>'+(selected!==q.a?'<p><b>Distractor:</b> '+q.wrong[selected]+'</p>':'')+'</div>'}
      body+='<div class="final-actions">'+(isGuided&&!show?btn('Check answer','exam-check','primary'):btn(i===questions.length-1?'Finish & debrief':'Next question →','exam-next','primary'))+'</div></div>';
    }
    $('#exam-view').innerHTML=body;
  };
  const examCheck=()=>{
    if(exam.answers[exam.index]===undefined){toast('Select an answer first.');return}
    exam.seen=true;const i=exam.index;record('exam-'+i,exam.answers[i]===questions[i].a);renderExam();
  };
  const examNext=()=>{
    if(exam.answers[exam.index]===undefined){toast('Select an answer first.');return}
    if(exam.mode==='guided'&&!exam.seen){toast('Check the answer before continuing.');return}
    if(exam.index===questions.length-1){
      if(exam.mode==='independent')questions.forEach((q,i)=>record('exam-'+i,exam.answers[i]===q.a));
      exam.finished=true;
    }else{exam.index++;exam.seen=false}
    renderExam();
  };
  const renderMap=()=>{
    const nodes=[
      ['1 · Environment','Distance, electromagnetic noise, fire/smoke requirements, space and pathway.'],
      ['2 · Medium','Copper UTP/STP, coax, single-mode or multimode fiber, or direct-attach twinax.'],
      ['3 · Performance','Category, speed, supported reach, insertion loss and optical power budget.'],
      ['4 · Endpoints','Switch/NIC port, matching SFP or QSFP form factor, optical standard, wavelength.'],
      ['5 · Connector','RJ45, F-type, BNC, LC, SC, ST, MPO, or integrated DAC ends.'],
      ['6 · Installation','T568A/B pairing, patch panel, bend radius, labeling, correct fiber polarity.']
    ];
    $('#map-view').innerHTML='<div class="panel"><div class="kicker">CAUSE → CONSTRAINT → SELECTION → VERIFICATION</div><h2>Functional relationship map</h2><div class="map-layout">'+nodes.map((x,i)=>'<div class="map-node"><b>'+x[0]+'</b><p>'+x[1]+'</p></div>').join('')+'</div><div class="flow-diagram">'+svg(box(8,36,125,55,'#163c46','#68c7ac',11)+box(168,36,125,55,'#163c46','#68c7ac',11)+box(329,36,125,55,'#163c46','#68c7ac',11)+line(136,64,166,64,'#f0b86b',5)+line(297,64,327,64,'#f0b86b',5)+label(70,68,'CHOOSE',17)+label(230,68,'INSTALL',17)+label(391,68,'VERIFY',17)+label(231,132,'Symptoms → Best test → Root cause → Safe fix → Retest',14))+'</div><div class="grid-2"><div class="panel"><h3>When a link fails</h3><p><b>Down/no light:</b> check media mismatch, transceiver type, TX/RX polarity, contamination, termination.</p><p><b>Intermittent/errors:</b> check cable length, attenuation, crosstalk, EMI, pair wiring, optical budget, CRC counters.</p><p><b>PoE issue:</b> distinguish the data path from PoE standard, negotiation and switch power budget.</p></div><div class="panel"><h3>Test selection</h3><p><b>Wiremap tester:</b> opens, shorts, miswires; some advanced testers identify split pairs.</p><p><b>Category certifier:</b> validates category performance such as NEXT and insertion loss.</p><p><b>Optical tools:</b> inspect/clean connectors, measure power/loss; use OTDR where fault location is needed.</p><p><b>Toner and probe:</b> trace an unknown cable; does not certify Ethernet bandwidth.</p></div></div><div class="exam-tip"><b>EXAM LOGIC:</b> The correct answer must explain the <em>decisive clue</em> better than all distractors. Prefer a low-risk test that isolates the suspected layer, then verify the system after a targeted fix.</div></div><div class="panel" style="margin-top:15px"><h2>Primary references</h2><div class="reference-list"><p>Chapter scope: Lammle &amp; Buhagiar, <i>CompTIA Network+ Study Guide N10-009</i>, 6th ed., Ch. 3, pp. 61–100. Source: <a target="_blank" rel="noopener" href="https://www.wiley.com/en-in/comptia-network-study-guide-exam-n10-009-6th-edition-p-9781394235612">Wiley table of contents</a>.</p><p>N10-009 objective 1.5 (transmission media and transceivers), 5.2 (cabling and physical interfaces): <a href="https://comptiacdn.azureedge.net/webcontent/docs/default-source/exam-objectives/comptia-network-n10-009-exam-objectives-%284-0%29-%281%29.pdf" target="_blank" rel="noopener">CompTIA exam objectives PDF</a>.</p><p>All exercises and illustrations in this simulator are original educational content; connector silhouettes are schematic.</p></div></div>';
  };
  document.addEventListener('click',e=>{
    const target=e.target.closest('button');if(!target)return;
    if(target.dataset.page)go(target.dataset.page);
    if(target.dataset.go)go(target.dataset.go);
    if(target.dataset.medium){mediumId=target.dataset.medium;renderAtlas()}
    if(target.dataset.connector){connectorId=target.dataset.connector;renderAtlas()}
    if(target.dataset.wireTask){wiring={task:target.dataset.wireTask,end:0,selected:'WO',A:Array(8).fill(null),B:Array(8).fill(null),graded:null,guide:false};renderWire()}
    if(target.dataset.wireEnd!==undefined){wiring.end=Number(target.dataset.wireEnd);renderWire()}
    if(target.dataset.swatch){wiring.selected=target.dataset.swatch;renderWire()}
    if(target.dataset.pin!==undefined){(wiring.end===0?wiring.A:wiring.B)[Number(target.dataset.pin)]=wiring.selected;wiring.graded=null;renderWire()}
    if(target.dataset.faultChoice!==undefined){fAnswers[fStep]=Number(target.dataset.faultChoice);renderFault()}
    if(target.dataset.examChoice!==undefined&&!exam.seen){exam.answers[exam.index]=Number(target.dataset.examChoice);renderExam()}
    if(target.dataset.confidence){exam.confidence[exam.index]=target.dataset.confidence;renderExam()}
    if(target.dataset.action){
      switch(target.dataset.action){
        case 'wire-grade':wireGrade();break;
        case 'wire-clear':wiring.A.fill(null);wiring.B.fill(null);wiring.graded=null;renderWire();break;
        case 'wire-guide':wiring.guide=!wiring.guide;renderWire();break;
        case 'design-grade':gradeDesign();break;
        case 'design-next':dIndex=(dIndex+1)%designs.length;dSelection={media:'',conn:'',jacket:''};dGrade=null;dTries=0;renderDesign();break;
        case 'fault-advance':faultAdvance();break;
        case 'fault-next':fIndex=(fIndex+1)%faults.length;fStep=0;fAnswers=[];fGrade=null;renderFault();break;
        case 'fault-repeat':fStep=0;fAnswers=[];fGrade=null;renderFault();break;
        case 'exam-guided':examStart('guided');break;
        case 'exam-independent':examStart('independent');break;
        case 'exam-check':examCheck();break;
        case 'exam-next':examNext();break;
      }
    }
  });
  document.addEventListener('change',e=>{if(e.target.dataset.design){dSelection[e.target.dataset.design]=e.target.value;dGrade=null;}});
  $('#reset-data').addEventListener('click',()=>{if(confirm('Clear all saved Chapter 3 practice history on this browser?')){progress={attempts:0,correct:0,weak:{},completed:{}};save();toast('Local learning record reset.')}});
  $('#hero-visual').innerHTML=heroSvg();
  renderStats();go('home');
  window.NET005A={getQuizCount:()=>questions.length,getMediaCount:()=>mediums.length,getConnectorCount:()=>connectors.length,getDesignCount:()=>designs.length,getFaultCount:()=>faults.length};
})();