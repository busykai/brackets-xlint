h			[0-9a-fA-F]
nonascii	[\200-\377]
unicode		\\{h}{1,6}[ \t\r\n\f]?
escape		{unicode}|\\[ -~\200-\377]
nmstart		[_a-zA-Z]|{nonascii}|{escape}
nmchar		[_a-zA-Z0-9-]|{nonascii}|{escape}
string1		\"([\t !#$%&(-~]|\\{nl}|\'|{nonascii}|{escape})*\"
string2		\'([\t !#$%&(-~]|\\{nl}|\"|{nonascii}|{escape})*\'
url			([!#$%&*-~]|{nonascii}|{escape})*

ident		[-]?{nmstart}{nmchar}*
num			[0-9]*"."[0-9]+|[0-9]+
intnum		[0-9]+
string		{string1}|{string2}
s 			[ \t\r\n\f]+
w			[ \t\r\n\f]*
nl			\n|\r\n|\r|\f
range		\?{1,6}|{h}(\?{0,5}|{h}(\?{0,4}|{h}(\?{0,3}|{h}(\?{0,2}|{h}(\??|{h})))))

%%
{s}									{return 'S';}
\/\*[^*]*\*+([^/][^*]*\*+)*\/		{}								/* ignore comment */

"url("{w}{string}{w}")"				{return 'URI';}
"url("{w}{url}{w}")"				{return 'URI';}

"!"{w}"important"					{return 'IMPORTANT_SYM';}

{string}							{return 'STRING';}
{ident}"("							{return "FUNCTION";}
{ident}								{return "IDENT";}
"#"{h}+								{return 'HEX';}
{num}"px"							{return 'PXS';}
{num}"cm"							{return 'CMS';}
{num}"mm"							{return 'MMS';}
{num}"in"							{return 'INS';}
{num}"pt"							{return 'PTS';}
{num}"pc"							{return 'PCS';}
{num}"vh"							{return 'VHS';}
{num}"vw"							{return 'VWS';}
{num}"vmin"							{return 'VMINS';}
{num}"vmax"							{return 'VMAXS';}
{num}"em"							{return 'EMS';}
{num}"ex"							{return 'EXS';}
{num}"ch"							{return 'CHS';}
{num}"rem"							{return 'REMS';}
{num}"%"							{return 'PERCENTAGE';}
{num}"deg"							{return 'DEGS';}
{num}"rad"							{return 'RADS';}
{num}"grad"							{return 'GRADS';}
{num}"turn"							{return 'TURNS';}
{num}"ms"							{return 'MSECS';}
{num}"s"							{return 'SECS';}
{num}"Hz"							{return 'HERTZ';}
{num}"kHz"							{return 'KHERTZ';}
{num}{ident}						{return 'DIMEN';}
{intnum}							{return 'INTEGER';}
{num}								{return 'FLOATTOKEN';}

"U+"{range}							{return 'UNICODERANGE';}
"U+"{h}{1,6}"-"{h}{1,6}				{return 'UNICODERANGE';}

.									{return yytext;}