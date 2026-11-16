#!/usr/bin/env python3
"""Build the Visual Atlas poster studies as editable, legible SVG artwork."""

from pathlib import Path
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/images/visual-atlas/posters"


def label(x, y, value, size=20, fill="#171717", weight=600, family="Arial, Helvetica, sans-serif", extra=""):
    return f'<text x="{x}" y="{y}" fill="{fill}" font-family="{family}" font-size="{size}" font-weight="{weight}" {extra}>{escape(value)}</text>'


def line(x1, y1, x2, y2, stroke="#171717", width=2, extra=""):
    return f'<path d="M{x1} {y1} L{x2} {y2}" fill="none" stroke="{stroke}" stroke-width="{width}" {extra}/>'


def svg(title, palette, art):
    bg, ink, accent, detail = palette
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="855" height="1100" viewBox="0 0 855 1100" role="img" aria-labelledby="title desc">
<title id="title">{escape(title)} poster study</title><desc id="desc">Original vector poster study with legible typeset wording in the {escape(title)} direction.</desc>
<defs>
 <linearGradient id="metal" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".24" stop-color="#98e7ee"/><stop offset=".48" stop-color="#fff"/><stop offset=".72" stop-color="#d39fff"/><stop offset="1" stop-color="#fff"/></linearGradient>
 <linearGradient id="night" x2="0" y2="1"><stop stop-color="#111431"/><stop offset=".62" stop-color="#401957"/><stop offset="1" stop-color="#e84e77"/></linearGradient>
 <radialGradient id="orb"><stop stop-color="#fff"/><stop offset=".2" stop-color="{accent}"/><stop offset="1" stop-color="{detail}"/></radialGradient>
 <pattern id="dots" width="15" height="15" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2.1" fill="{ink}"/></pattern>
 <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="{accent}" stroke-width="1" opacity=".55"/></pattern>
 <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>
</defs>
<rect width="855" height="1100" fill="{bg}"/>
{art}
</svg>'''


studies = {
    "swiss": ("Swiss Typographic", ("#f4ecd7", "#111111", "#df2a22", "#aeb4ad"), '''
<g stroke="#171717" stroke-width="2" opacity=".45"><path d="M72 120V968M270 120V968M468 120V968M666 120V968M72 390H782M72 672H782M72 884H782"/></g>
<circle cx="468" cy="390" r="182" fill="#df2a22"/><rect x="82" y="142" width="20" height="230" fill="#111"/>
<text x="130" y="260" font-family="Arial,Helvetica,sans-serif" font-size="102" font-weight="700" letter-spacing="-8" fill="#111">FORM</text>
<text x="130" y="355" font-family="Arial,Helvetica,sans-serif" font-size="70" font-weight="400" letter-spacing="3" fill="#111">AND ORDER</text>
<text x="96" y="748" font-family="Arial,Helvetica,sans-serif" font-size="82" font-weight="700" letter-spacing="-4" fill="#111">TYPE / SPACE</text>
<text x="98" y="808" font-family="Arial,Helvetica,sans-serif" font-size="21" letter-spacing="3" fill="#111">A STUDY IN GRID, SCALE AND CONTRAST</text>
<text x="98" y="966" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="2" fill="#111">CRIO VISUAL ATLAS  /  01</text>'''),
    "experimental": ("Experimental Typography", ("#101124", "#f4f1e7", "#b8ff32", "#5947a7"), '''
<rect x="0" y="0" width="855" height="1100" fill="url(#grid)" opacity=".25"/>
<path d="M-20 260L875 465M-20 620L875 180M45 0V1100M710 0V1100" stroke="#f4f1e7" stroke-width="3" opacity=".7"/>
<text x="62" y="354" font-family="Arial,Helvetica,sans-serif" font-size="202" font-weight="800" letter-spacing="-20" fill="#f4f1e7" transform="rotate(-8 62 354)">TYPE</text>
<text x="72" y="574" font-family="Arial,Helvetica,sans-serif" font-size="160" font-weight="800" letter-spacing="-12" fill="#b8ff32" transform="rotate(7 72 574)">MOVES</text>
<circle cx="674" cy="804" r="71" fill="none" stroke="#b8ff32" stroke-width="5"/><circle cx="674" cy="804" r="25" fill="#b8ff32"/>
<text x="78" y="890" font-family="Georgia,serif" font-size="29" font-style="italic" fill="#f4f1e7">Letterforms become the image.</text>
<text x="78" y="1000" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="3" fill="#f4f1e7">CRIO VISUAL ATLAS  /  02</text>'''),
    "neo": ("Neo-Brutalist", ("#ff78b5", "#111111", "#f8e735", "#48e2d1"), '''
<rect x="78" y="105" width="700" height="842" fill="#111"/>
<rect x="55" y="82" width="700" height="842" fill="#fff8de" stroke="#111" stroke-width="12"/>
<rect x="55" y="82" width="700" height="94" fill="#f8e735" stroke="#111" stroke-width="12"/>
<text x="88" y="146" font-family="Arial,Helvetica,sans-serif" font-size="30" font-weight="900" letter-spacing="2" fill="#111">DESIGN RULES, RECONSIDERED</text>
<text x="88" y="410" font-family="Arial,Helvetica,sans-serif" font-size="156" font-weight="900" letter-spacing="-10" fill="#111">BREAK</text>
<text x="88" y="570" font-family="Arial,Helvetica,sans-serif" font-size="156" font-weight="900" letter-spacing="-10" fill="#df2a22">THE</text>
<text x="88" y="730" font-family="Arial,Helvetica,sans-serif" font-size="156" font-weight="900" letter-spacing="-10" fill="#111">GRID.</text>
<rect x="84" y="778" width="340" height="72" fill="#48e2d1" stroke="#111" stroke-width="8" transform="rotate(-3 84 778)"/>
<text x="105" y="827" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="900" fill="#111">FORM FOLLOWS ENERGY</text>
<text x="86" y="888" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" letter-spacing="2" fill="#111">CRIO VISUAL ATLAS  /  03</text>'''),
    "editorial": ("Minimal Editorial", ("#f3e7c8", "#211f1a", "#a78f6c", "#d5c8ad"), '''
<rect x="86" y="88" width="683" height="924" fill="#f9f2e2"/>
<text x="128" y="218" font-family="Georgia,serif" font-size="72" fill="#211f1a">A place</text>
<text x="128" y="302" font-family="Georgia,serif" font-size="72" fill="#211f1a">to pause.</text>
<path d="M128 365H724" stroke="#a78f6c" stroke-width="2"/>
<path d="M177 760L177 530Q177 428 287 428H575Q680 428 680 530V760Z" fill="#d5c8ad"/>
<path d="M247 760V560Q247 492 315 492H535Q610 492 610 560V760" fill="#f3e7c8"/>
<path d="M304 760V617Q304 566 354 566H500Q553 566 553 617V760" fill="#a78f6c"/>
<path d="M128 800H724" stroke="#a78f6c" stroke-width="2"/>
<text x="128" y="856" font-family="Arial,Helvetica,sans-serif" font-size="18" letter-spacing="2" fill="#211f1a">FORM, LIGHT AND RESTRAINT</text>
<text x="128" y="943" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="2" fill="#211f1a">CRIO VISUAL ATLAS  /  04</text>'''),
    "collage": ("Mixed-Media Collage", ("#eee1c9", "#171717", "#dc4b36", "#226573"), '''
<path d="M0 130L620 0L855 220L720 1100H160Z" fill="#e6d1aa"/>
<path d="M82 180L700 95L780 370L148 445Z" fill="#f7f0de" stroke="#171717" stroke-width="5" transform="rotate(-7 82 180)"/>
<path d="M120 445L628 360L762 910L210 1000Z" fill="#dc4b36" stroke="#171717" stroke-width="5" transform="rotate(5 120 445)"/>
<circle cx="597" cy="310" r="112" fill="#226573" stroke="#171717" stroke-width="5"/>
<path d="M86 650L555 558L620 760L145 847Z" fill="#f7f0de" stroke="#171717" stroke-width="5" transform="rotate(-6 86 650)"/>
<text x="120" y="286" font-family="Georgia,serif" font-size="82" font-style="italic" fill="#171717" transform="rotate(-7 120 286)">Cut.</text>
<text x="150" y="555" font-family="Arial,Helvetica,sans-serif" font-size="112" font-weight="800" fill="#f7f0de" transform="rotate(5 150 555)">PASTE</text>
<text x="175" y="737" font-family="Arial,Helvetica,sans-serif" font-size="74" font-weight="700" fill="#171717" transform="rotate(-6 175 737)">KEEP / MOVE</text>
<text x="114" y="954" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="2" fill="#171717">CRIO VISUAL ATLAS  /  05</text>'''),
    "riso": ("Risograph and Screen Print", ("#f1dfc2", "#154c3a", "#e85b43", "#e6b544"), '''
<rect x="55" y="55" width="745" height="990" fill="#f7ecd7" stroke="#154c3a" stroke-width="3"/>
<text x="91" y="163" font-family="Arial,Helvetica,sans-serif" font-size="52" font-weight="800" letter-spacing="1" fill="#154c3a">LOCAL FLOWERS</text>
<text x="95" y="203" font-family="Arial,Helvetica,sans-serif" font-size="20" letter-spacing="4" fill="#e85b43">A PRINT STUDY IN THREE INKS</text>
<g opacity=".82" transform="translate(7 4)"><path d="M435 826V505M435 683L280 540M435 720L605 554" stroke="#154c3a" stroke-width="18"/><g fill="#e85b43"><ellipse cx="435" cy="420" rx="65" ry="126"/><ellipse cx="435" cy="420" rx="65" ry="126" transform="rotate(60 435 420)"/><ellipse cx="435" cy="420" rx="65" ry="126" transform="rotate(120 435 420)"/></g><circle cx="435" cy="420" r="54" fill="#e6b544"/><g fill="#154c3a"><ellipse cx="272" cy="539" rx="36" ry="83" transform="rotate(-50 272 539)"/><ellipse cx="598" cy="550" rx="36" ry="83" transform="rotate(45 598 550)"/></g></g>
<g opacity=".38" transform="translate(-7 -4)" fill="#e6b544"><circle cx="435" cy="420" r="136"/><ellipse cx="272" cy="539" rx="36" ry="83"/><ellipse cx="598" cy="550" rx="36" ry="83"/></g>
<path d="M90 900H765" stroke="#154c3a" stroke-width="3"/>
<text x="95" y="959" font-family="Georgia,serif" font-size="36" fill="#154c3a">Ink overlap is part of the image.</text>
<text x="95" y="1002" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="2" fill="#154c3a">CRIO VISUAL ATLAS  /  06</text>'''),
    "grunge": ("Grunge Zine", ("#ece9dc", "#171717", "#c5302e", "#77756e"), '''
<path d="M0 82L855 105L838 235L855 250L836 377L855 395L824 520L846 538L855 672L825 686L849 833L827 847L855 1012L0 994L21 871L0 849L25 700L2 680L20 549L0 532L17 393L0 368L27 230L0 212Z" fill="#f4f1e8"/>
<path d="M0 1050L855 1010" stroke="#171717" stroke-width="18" filter="url(#rough)"/>
<g fill="#171717"><rect x="80" y="180" width="672" height="10"/><rect x="104" y="205" width="580" height="5"/><rect x="92" y="826" width="630" height="7"/></g>
<text x="78" y="350" font-family="Arial,Helvetica,sans-serif" font-size="124" font-weight="900" letter-spacing="-6" fill="#171717">NOISE</text>
<text x="95" y="485" font-family="Arial,Helvetica,sans-serif" font-size="111" font-weight="900" letter-spacing="-5" fill="#c5302e" transform="rotate(-3 95 485)">IS A</text>
<text x="73" y="632" font-family="Arial,Helvetica,sans-serif" font-size="124" font-weight="900" letter-spacing="-6" fill="#171717">CHOICE.</text>
<path d="M89 663L770 576M105 681L740 598M120 701L725 622" stroke="#c5302e" stroke-width="8"/>
<text x="96" y="774" font-family="monospace" font-size="22" fill="#171717">CUT / COPY / PRINT / REPEAT</text>
<text x="93" y="920" font-family="monospace" font-size="18" letter-spacing="2" fill="#171717">CRIO VISUAL ATLAS  /  07</text>'''),
    "cinematic": ("Cinematic Photography", ("#121325", "#f6e6bf", "#f0a34e", "#b92d59"), '''
<rect width="855" height="1100" fill="url(#night)"/>
<circle cx="427" cy="528" r="148" fill="#f0a34e" opacity=".82"/>
<path d="M0 585L250 510L330 550L420 454L522 542L650 473L855 580V780H0Z" fill="#20223d"/>
<path d="M0 675L855 675V1100H0Z" fill="#111321"/>
<path d="M80 1100L360 690H495L775 1100M295 1100L401 690H454L560 1100" fill="#29243b" stroke="#d94a6d" stroke-width="5"/>
<path d="M424 606V845" stroke="#f6e6bf" stroke-width="18"/><circle cx="433" cy="604" r="38" fill="#f0a34e"/>
<text x="70" y="178" font-family="Georgia,serif" font-size="35" letter-spacing="8" fill="#f6e6bf">AFTER THE RAIN</text>
<text x="67" y="930" font-family="Arial,Helvetica,sans-serif" font-size="98" font-weight="700" letter-spacing="-3" fill="#f6e6bf">NIGHT</text>
<text x="67" y="1025" font-family="Arial,Helvetica,sans-serif" font-size="98" font-weight="700" letter-spacing="-3" fill="#f6e6bf">DRIVE</text>
<text x="654" y="1023" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="2" fill="#f6e6bf">CRIO / 08</text>'''),
    "surreal3d": ("Three-Dimensional Surrealism", ("#b7e2e6", "#263c53", "#d39472", "#f5e8d4"), '''
<rect width="855" height="1100" fill="#b7e2e6"/>
<circle cx="660" cy="235" r="94" fill="#f5e8d4"/>
<path d="M0 790Q240 700 430 805T855 770V1100H0Z" fill="#d7c4a5"/>
<path d="M93 700V375Q93 152 317 152H552Q772 152 772 375V700H670V392Q670 250 540 250H330Q195 250 195 392V700Z" fill="#f5e8d4"/>
<circle cx="426" cy="515" r="178" fill="url(#orb)" stroke="#f5e8d4" stroke-width="17"/>
<path d="M290 642Q426 566 563 642" fill="none" stroke="#263c53" stroke-width="8" opacity=".65"/>
<text x="78" y="870" font-family="Georgia,serif" font-size="64" fill="#263c53">Another reality.</text>
<text x="82" y="924" font-family="Arial,Helvetica,sans-serif" font-size="19" letter-spacing="3" fill="#263c53">SCALE, SPACE AND THE IMPOSSIBLE OBJECT</text>
<text x="82" y="1018" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="2" fill="#263c53">CRIO VISUAL ATLAS  /  09</text>'''),
    "retrofuture": ("Retro-Futurism", ("#174a58", "#f9d49d", "#f18454", "#24415a"), '''
<rect width="855" height="1100" fill="#174a58"/><circle cx="427" cy="445" r="246" fill="#f18454"/>
<path d="M181 445H673M198 512H656M232 579H622M286 646H570" stroke="#174a58" stroke-width="20"/>
<path d="M0 700L200 602L310 710L420 570L540 712L690 590L855 690V1100H0Z" fill="#24415a"/>
<path d="M0 768H855M0 842H855M0 916H855M0 990H855M130 700L0 1100M310 700L205 1100M510 700L510 1100M700 700L855 1100" stroke="#f9d49d" stroke-width="3" opacity=".67"/>
<text x="64" y="148" font-family="Arial,Helvetica,sans-serif" font-size="23" letter-spacing="7" fill="#f9d49d">A TOMORROW FROM YESTERDAY</text>
<text x="66" y="270" font-family="Arial,Helvetica,sans-serif" font-size="91" font-weight="800" letter-spacing="-5" fill="#f9d49d">FUTURE</text>
<text x="66" y="360" font-family="Arial,Helvetica,sans-serif" font-size="91" font-weight="800" letter-spacing="-5" fill="#f9d49d">MEMORY</text>
<text x="66" y="1040" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="3" fill="#f9d49d">CRIO VISUAL ATLAS  /  10</text>'''),
    "bauhaus": ("Bauhaus", ("#f1e9d7", "#151515", "#d9322a", "#e4b73f"), '''
<rect x="65" y="66" width="725" height="968" fill="none" stroke="#151515" stroke-width="4"/>
<circle cx="622" cy="278" r="146" fill="#d9322a"/><rect x="93" y="154" width="210" height="210" fill="#151515"/>
<path d="M310 615L522 367L730 615Z" fill="#e4b73f" stroke="#151515" stroke-width="6"/>
<path d="M99 468H460V560H99ZM99 570H247V660H99Z" fill="#244d84"/>
<text x="96" y="756" font-family="Arial,Helvetica,sans-serif" font-size="96" font-weight="800" letter-spacing="-6" fill="#151515">FORM</text>
<text x="96" y="854" font-family="Arial,Helvetica,sans-serif" font-size="96" font-weight="800" letter-spacing="-6" fill="#151515">FOLLOWS USE</text>
<text x="100" y="965" font-family="Arial,Helvetica,sans-serif" font-size="18" letter-spacing="3" fill="#151515">FUNCTION / SHAPE / COLOUR</text>
<text x="100" y="1004" font-family="Arial,Helvetica,sans-serif" font-size="15" letter-spacing="2" fill="#151515">CRIO VISUAL ATLAS  /  11</text>'''),
    "psychedelic": ("Psychedelic", ("#3a2473", "#fff0b3", "#ee5936", "#cf3a8c"), '''
<rect width="855" height="1100" fill="#3a2473"/>
<path d="M-30 90Q190 250 425 90T900 90M-30 175Q190 335 425 175T900 175M-30 260Q190 420 425 260T900 260" fill="none" stroke="#ee5936" stroke-width="28"/>
<path d="M-20 850Q185 680 427 850T875 850M-20 935Q185 765 427 935T875 935" fill="none" stroke="#cf3a8c" stroke-width="30"/>
<circle cx="425" cy="544" r="215" fill="#e4b73f"/><circle cx="425" cy="544" r="164" fill="#ee5936"/><circle cx="425" cy="544" r="111" fill="#3a2473"/>
<text x="425" y="514" text-anchor="middle" font-family="Georgia,serif" font-size="68" font-weight="700" fill="#fff0b3">KEEP</text>
<text x="425" y="592" text-anchor="middle" font-family="Georgia,serif" font-size="68" font-weight="700" fill="#fff0b3">LOOKING</text>
<text x="75" y="1030" font-family="Arial,Helvetica,sans-serif" font-size="17" letter-spacing="3" fill="#fff0b3">CRIO VISUAL ATLAS  /  12</text>'''),
    "deco": ("Art Deco", ("#111719", "#e8c27a", "#8c6047", "#f3e5c8"), '''
<rect x="48" y="48" width="759" height="1004" fill="none" stroke="#e8c27a" stroke-width="3"/>
<rect x="72" y="72" width="711" height="956" fill="none" stroke="#e8c27a" stroke-width="1"/>
<path d="M130 800V415Q130 140 427 140Q725 140 725 415V800M200 800V425Q200 214 427 214Q655 214 655 425V800M270 800V436Q270 285 427 285Q585 285 585 436V800" fill="none" stroke="#e8c27a" stroke-width="4"/>
<path d="M360 535L427 411L495 535V800H360Z" fill="#8c6047" stroke="#e8c27a" stroke-width="3"/>
<text x="427" y="884" text-anchor="middle" font-family="Georgia,serif" font-size="65" letter-spacing="6" fill="#e8c27a">NIGHT OF GOLD</text>
<text x="427" y="939" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="18" letter-spacing="5" fill="#f3e5c8">GEOMETRY / ORNAMENT / RHYTHM</text>
<text x="427" y="1001" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="15" letter-spacing="3" fill="#e8c27a">CRIO VISUAL ATLAS  /  13</text>'''),
    "y2k": ("Y2K", ("#c6b8f0", "#29234d", "#a0e8ed", "#f4d9fa"), '''
<rect width="855" height="1100" fill="#d7c8f4"/>
<circle cx="183" cy="233" r="75" fill="url(#orb)"/><circle cx="680" cy="622" r="50" fill="url(#metal)"/>
<ellipse cx="427" cy="503" rx="336" ry="127" fill="none" stroke="#fff" stroke-width="20" opacity=".65" transform="rotate(-22 427 503)"/>
<ellipse cx="427" cy="503" rx="336" ry="127" fill="none" stroke="#a0e8ed" stroke-width="5" transform="rotate(-22 427 503)"/>
<text x="427" y="458" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="104" font-weight="900" letter-spacing="-7" fill="url(#metal)" stroke="#fff" stroke-width="2">DIGITAL</text>
<text x="427" y="565" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="88" font-weight="700" letter-spacing="7" fill="#fff">DREAMS</text>
<path d="M120 760L170 777L185 830L202 777L254 760L202 743L185 691L170 743ZM642 256L672 266L682 296L692 266L722 256L692 246L682 216L672 246Z" fill="#fff"/>
<text x="67" y="1018" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="3" fill="#29234d">CRIO VISUAL ATLAS  /  14</text>'''),
    "pop": ("Pop Art", ("#ffe83d", "#111111", "#eb3c4b", "#225bc2"), '''
<rect width="855" height="1100" fill="#ffe83d"/><rect width="855" height="1100" fill="url(#dots)" opacity=".4"/>
<path d="M425 110L480 247L635 190L591 343L746 380L620 480L740 605L575 615L595 788L445 713L360 870L305 710L145 770L205 615L64 540L216 465L130 325L290 351Z" fill="#eb3c4b" stroke="#111" stroke-width="12"/>
<ellipse cx="428" cy="475" rx="233" ry="201" fill="#fff" stroke="#111" stroke-width="12"/>
<text x="428" y="516" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="150" font-weight="900" letter-spacing="-6" fill="#225bc2" stroke="#111" stroke-width="3">WOW!</text>
<path d="M555 625L635 729L530 704Z" fill="#fff" stroke="#111" stroke-width="10"/>
<text x="428" y="887" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="44" font-weight="900" fill="#111">A STUDY IN IMPACT</text>
<text x="428" y="1000" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="3" fill="#111">CRIO VISUAL ATLAS  /  15</text>'''),
    "cyberpunk": ("Cyberpunk", ("#09132a", "#f7f4ff", "#fc329b", "#23e7e4"), '''
<rect width="855" height="1100" fill="#09132a"/><rect width="855" height="1000" fill="url(#grid)" opacity=".25"/>
<path d="M0 500H115V332H207V451H283V253H371V510H448V374H543V486H635V286H722V410H855V1000H0Z" fill="#101b39" stroke="#23e7e4" stroke-width="4"/>
<g fill="#fc329b"><rect x="139" y="375" width="39" height="8"/><rect x="309" y="302" width="38" height="8"/><rect x="662" y="334" width="39" height="8"/></g>
<path d="M0 756H855M0 823H855M0 890H855M120 620L0 1100M310 600L220 1100M520 620L560 1100M735 610L855 1100" stroke="#23e7e4" stroke-width="2" opacity=".65"/>
<text x="70" y="158" font-family="monospace" font-size="22" letter-spacing="6" fill="#23e7e4">SIGNAL / NIGHT CITY</text>
<text x="70" y="713" font-family="Arial,Helvetica,sans-serif" font-size="108" font-weight="900" letter-spacing="-4" fill="#fc329b">CITY</text>
<text x="70" y="814" font-family="Arial,Helvetica,sans-serif" font-size="108" font-weight="900" letter-spacing="-4" fill="#f7f4ff">SIGNAL</text>
<text x="72" y="1010" font-family="monospace" font-size="16" letter-spacing="3" fill="#23e7e4">CRIO VISUAL ATLAS  /  16</text>'''),
    "organic": ("Hand-Drawn Illustration", ("#f3e4d8", "#294d3c", "#b65c4e", "#dfbd87"), '''
<rect x="50" y="50" width="755" height="1000" rx="9" fill="#f8efe3" stroke="#294d3c" stroke-width="3"/>
<g fill="none" stroke="#294d3c" stroke-width="8" stroke-linecap="round"><path d="M440 858Q407 669 433 360M430 621Q331 531 222 505M432 700Q541 593 662 562M426 491Q520 416 563 325M426 775Q305 704 235 670"/></g>
<g fill="#b65c4e" stroke="#294d3c" stroke-width="5"><ellipse cx="222" cy="505" rx="45" ry="105" transform="rotate(-50 222 505)"/><ellipse cx="662" cy="562" rx="43" ry="100" transform="rotate(52 662 562)"/><ellipse cx="563" cy="325" rx="42" ry="95" transform="rotate(25 563 325)"/><ellipse cx="235" cy="670" rx="40" ry="90" transform="rotate(-55 235 670)"/></g>
<circle cx="428" cy="323" r="87" fill="#dfbd87" stroke="#294d3c" stroke-width="5"/><g fill="#b65c4e"><circle cx="402" cy="298" r="10"/><circle cx="451" cy="299" r="10"/><circle cx="427" cy="343" r="10"/></g>
<text x="428" y="934" text-anchor="middle" font-family="Georgia,serif" font-size="55" fill="#294d3c">Grow with care.</text>
<text x="428" y="991" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="17" letter-spacing="3" fill="#294d3c">A BOTANICAL STUDY / 17</text>'''),
    "maximal": ("Maximalist", ("#ffdc3e", "#151515", "#ef3c72", "#244bc2"), '''
<rect width="855" height="1100" fill="#ef3c72"/><path d="M0 100L855 880M-100 500L740 0M60 0L850 650M0 1010L855 260" stroke="#ffdc3e" stroke-width="60"/>
<circle cx="645" cy="265" r="183" fill="#244bc2" stroke="#151515" stroke-width="12"/><circle cx="645" cy="265" r="126" fill="#ef3c72" stroke="#ffdc3e" stroke-width="18"/>
<path d="M89 195L765 195L712 855L142 855Z" fill="#fff8de" stroke="#151515" stroke-width="12" transform="rotate(-7 89 195)"/>
<text x="130" y="423" font-family="Arial,Helvetica,sans-serif" font-size="168" font-weight="900" letter-spacing="-9" fill="#151515" transform="rotate(-7 130 423)">MORE</text>
<text x="159" y="565" font-family="Arial,Helvetica,sans-serif" font-size="105" font-weight="900" letter-spacing="-5" fill="#244bc2" transform="rotate(-7 159 565)">ON THE</text>
<text x="174" y="700" font-family="Arial,Helvetica,sans-serif" font-size="122" font-weight="900" letter-spacing="-6" fill="#ef3c72" transform="rotate(-7 174 700)">PAGE</text>
<text x="80" y="1018" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="3" fill="#151515">CRIO VISUAL ATLAS  /  18</text>'''),
    "aurora": ("Aurora", ("#08172d", "#f7f4ed", "#48d7ab", "#7774ed"), '''
<rect width="855" height="1100" fill="#08172d"/>
<path d="M-100 540C120 160 230 240 370 489S630 802 940 280" fill="none" stroke="#48d7ab" stroke-width="115" opacity=".52"/>
<path d="M-120 640C140 290 270 355 435 604S690 850 960 430" fill="none" stroke="#7774ed" stroke-width="82" opacity=".68"/>
<path d="M-100 760C120 440 303 486 464 707S700 940 950 610" fill="none" stroke="#f7f4ed" stroke-width="16" opacity=".56"/>
<circle cx="674" cy="202" r="3" fill="#f7f4ed"/><circle cx="172" cy="280" r="4" fill="#f7f4ed"/><circle cx="710" cy="520" r="3" fill="#f7f4ed"/>
<text x="68" y="160" font-family="Arial,Helvetica,sans-serif" font-size="22" letter-spacing="6" fill="#48d7ab">LIGHT IN MOTION</text>
<text x="68" y="900" font-family="Georgia,serif" font-size="92" fill="#f7f4ed">Soft light.</text>
<text x="72" y="965" font-family="Arial,Helvetica,sans-serif" font-size="17" letter-spacing="3" fill="#f7f4ed">CRIO VISUAL ATLAS  /  19</text>'''),
    "construct": ("Constructivist Photomontage", ("#eee7d5", "#16191a", "#c93329", "#a0a5a0"), '''
<rect width="855" height="1100" fill="#eee7d5"/><path d="M0 0H855L474 1100H0Z" fill="#c93329"/>
<path d="M855 0V1100H473L855 0Z" fill="#16191a"/>
<path d="M0 330L855 560M0 380L855 610M0 430L855 660" stroke="#eee7d5" stroke-width="12"/>
<circle cx="594" cy="298" r="121" fill="#a0a5a0"/><path d="M506 429Q591 360 680 432L745 677H446Z" fill="#eee7d5"/>
<text x="53" y="755" font-family="Arial,Helvetica,sans-serif" font-size="115" font-weight="900" letter-spacing="-6" fill="#eee7d5" transform="rotate(-23 53 755)">BUILD</text>
<text x="47" y="880" font-family="Arial,Helvetica,sans-serif" font-size="102" font-weight="900" letter-spacing="-5" fill="#16191a" transform="rotate(-23 47 880)">TOGETHER</text>
<text x="74" y="1012" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="3" fill="#16191a">CRIO VISUAL ATLAS  /  20</text>'''),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for key, (title, palette, art) in studies.items():
        (OUT / f"{key}.svg").write_text(svg(title, palette, art), encoding="utf-8")
    print(f"Wrote {len(studies)} legible SVG poster studies to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
