import { useEffect, useRef, useState } from 'react';
\nimport {
\n    Activity,
\n    AlertTriangle,
\n    ArrowUpRight,
\n    Brain,
\n    CheckCircle2,
\n    ClipboardCheck,
\n    Database,
\n    FileCheck2,
\n    FileText,
\n    Globe2,
\n    HandHeart,
\n    History,
\n    Heart,
\n    Pill,
\n    RefreshCw,
\n    Send,
\n    ShieldCheck,
\n    Sparkles,
\n    Stethoscope,
\n    Zap,
\n} from 'lucide-react';
\nimport { api, ws } from '@appdeploy/client';
\n
\ntype CaseRecord = {
\n    id: string;
\n    drug: string;
\n    reaction: string;
\n    seriousness: string;
\n    status: string;
\n    aiConfidence: number;
\n    humanVerified: boolean;
\n};
\n
\ntype Signal = {
\n    id?: string;
\n    title: string;
\n    severity: string;
\n    source: string;
\n    country: string;
\n    impact: string;
\n    prr: number;
\n    ror: number;
\n    trend: string;
\n    created_at: number;
\n};
\n
\ntype Audit = {
\n    id?: string;
\n    actor: string;
\n    action: string;
\n    entity: string;
\n    timestamp: number;
\n    hash: string;
\n};
\n
\ntype Source = {
\n    id: string;
\n    name: string;
\n    region: string;
\n    status: string;
\n    message: string;
\n    url: string;
\n    lastChecked?: number;
\n};
\n
\nconst sourceSeed: Source[] = [
\n    {
\n        id: 'eudravigilance',
\n        name: 'EMA EudraVigilance',
\n        region: 'EEA',
\n        status: 'READY-GATED',
\n        message: 'E2B(R3) workflow ready; production gateway requires EMA registration/credentials',
\n        url: 'https://www.ema.europa.eu/en/human-regulatory-overview/research-development/pharmacovigilance-research-development/eudravigilance',
\n    },
\n    {
\n        id: 'cima',
\n        name: 'AEMPS CIMA',
\n        region: 'Spain',
\n        status: 'LIVE',
\n        message: 'Official medicine/supply source monitored',
\n        url: 'https://cima.aemps.es/cima/',
\n    },
\n    {
\n        id: 'bifimed',
\n        name: 'BIFIMED',
\n        region: 'Spain',
\n        status: 'LIVE',
\n        message: 'Financing and nomenclator intelligence monitored',
\n        url: 'https://www.sanidad.gob.es/areas/farmacia/',
\n    },
\n];
\n
\nconst defaultCases: CaseRecord[] = [
\n    {
\n        id: 'ICSR-00041',
\n        drug: 'trastuzumab',
\n        reaction: 'cardiac dysfunction',
\n        seriousness: 'Serious',
\n        status: 'AI REVIEW',
\n        aiConfidence: 96,
\n        humanVerified: false,
\n    },
\n    {
\n        id: 'ICSR-00042',
\n        drug: 'adalimumab',
\n        reaction: 'anaphylactic reaction',
\n        seriousness: 'Serious',
\n        status: 'HUMAN VERIFIED',
\n        aiConfidence: 94,
\n        humanVerified: true,
\n    },
\n    {
\n        id: 'ICSR-00043',
\n        drug: 'semaglutide',
\n        reaction: 'pancreatitis',
\n        seriousness: 'Serious',
\n        status: 'DRAFT',
\n        aiConfidence: 89,
\n        humanVerified: false,
\n    },
\n];
\n
\nfunction App() {
\n    const [tab, setTab] = useState('Overview');
\n    const [sources, setSources] = useState<Source[]>(sourceSeed);
\n    const [cases, setCases] = useState<CaseRecord[]>(defaultCases);
\n    const [signals, setSignals] = useState<Signal[]>([]);
\n    const [audits, setAudits] = useState<Audit[]>([]);
\n    const [notice, setNotice] = useState('');
\nconst [approvals, setApprovals] = useState<Array<any>>([]);
\nconst [approvalsLoading, setApprovalsLoading] = useState<boolean>(true);
\nconst [approvalsError, setApprovalsError] = useState<string | null>(null);
\n    const [busy, setBusy] = useState(false);
\n    const conn = useRef<ReturnType<typeof ws.connect> | null>(null);
\n
\n    const load = async () => {
\n        try {
\n            const r = await api.get('/api/dashboard');
\n            const d = r.data as {
\n                sources?: Source[];
\n                cases?: CaseRecord[];
\n                signals?: Signal[];
\n                audits?: Audit[];
\n            };
\n            if (d.sources?.length) setSources(d.sources);
\n            if (d.cases?.length) setCases(d.cases);
\n            if (d.signals) setSignals(d.signals);
\n            if (d.audits) setAudits(d.audits);
\n        } catch {
\n            setNotice('Dashboard is using safe local defaults while the backend reconnects.');
\n        }
\n    };
\n
\n    useEffect(() => {
\n        load();
\n        const c = ws.connect();
\n        conn.current = c;
\n        c.onMessage((message) => {
\n            if (
\n                message?.type === 'entity.update' &&
\n                message.payload?.entity_type === 'pharma-dashboard'
\n            ) {
\n                const d = message.payload.data as {
\n                    sources?: Source[];
\n                    cases?: CaseRecord[];
\n                    signals?: Signal[];
\n                    audits?: Audit[];
\n                };
\n                if (d.sources) setSources(d.sources);
\n                if (d.cases) setCases(d.cases);
\n                if (d.signals) setSignals(d.signals);
\n                if (d.audits) setAudits(d.audits);
\n            }
\n        });
\n        c.ready.then(() => {
\n            if (c.connectionId) {
\n                api.post('/api/subscriptions', {
\n                    entity_type: 'pharma-dashboard',
\n                    entity_id: 'global',
\n                    connection_id: c.connectionId,
\n                });
\n            }
\n        });
\n        return () => {
\n            if (c.connectionId) {
\n                api.post('/api/subscriptions/remove', {
\n                    entity_type: 'pharma-dashboard',
\n                    entity_id: 'global',
\n                    connection_id: c.connectionId,
\n                });
\n            }
\n            c.disconnect();
\n        };
\n    }, []);
\n
\n    const refresh = async () => {
\n        setBusy(true);
\n        setNotice('Refreshing official-source control plane…');
\n        try {
\n            const r = await api.post('/api/refresh', {});
\n            const d = r.data;
\n            setSources(d.sources || sources);
\n            setSignals(d.signals || []);
\n            setAudits(d.audits || []);
\n            setNotice('Source checks completed and audit evidence updated.');
\n        } catch {
\n            setNotice('Refresh failed safely; no regulatory status was fabricated.');
\n        } finally {
\n            setBusy(false);
\n        }
\n    };
\n
\n    const runSignal = async () => {
\n        setBusy(true);
\n        setNotice('Calculating disproportionality on the demonstration dataset…');
\n        try {
\n            const r = await api.post('/api/signals/analyze', {});
\n            setSignals(r.data.signals || []);
\n            setAudits(r.data.audits || []);
\n            setTab('Signals');
\n            setNotice('Signal analysis completed with PRR/ROR and trend indicators.');
\n        } catch {
\n            setNotice('Signal analysis failed; no signal was promoted automatically.');
\n        } finally {
\n            setBusy(false);
\n        }
\n    };
\n
\n    const generateReport = async () => {
\n        setBusy(true);
\n        setNotice('Building PSUR/PBRER working draft from verified records…');
\n        try {
\n            const r = await api.post('/api/reports/psur', {});
\n            setAudits(r.data.audits || []);
\n            setTab('Reports');
\n            setNotice('PSUR/PBRER draft generated for human regulatory review.');
\n        } catch {
\n            setNotice('Report generation failed safely.');
\n        } finally {
\n            setBusy(false);
\n        }
\n    };
\n
\n    const verifyCase = async (id: string) => {
\n        try {
\n            const r = await api.post('/api/cases/verify', { id });
\n            setCases(r.data.cases || cases);
\n            setAudits(r.data.audits || audits);
\n            setNotice(`Human verification recorded for ${id}.`);
\n        } catch {
\n            setNotice('Verification could not be recorded.');
\n        }
\n    };
\n
\n    const e2b = async () => {
\n        setBusy(true);
\n        setNotice('Generating ISO/ICH E2B(R3) XML validation package…');
\n        try {
\n            const r = await api.post('/api/icsr/e2b-r3', { caseId: cases[0]?.id });
\n            setAudits(r.data.audits || audits);
\n            setNotice(
\n                `E2B(R3) package ${r.data.packageId} generated. Production transmission remains registration-gated.`,
\n            );
\n            setTab('ICSR / E2B');
\n        } catch {
\n            setNotice('E2B(R3) package generation failed validation.');
\n        } finally {
\n            setBusy(false);
\n        }
\n    };
\n
\n    const nav = [
\n        ['Overview', Activity],
\n        ['ICSR / E2B', FileCheck2],
\n        ['Signals', AlertTriangle],
\n        ['Reports', FileText],
\n        ['AI Governance', Brain],
\n        ['Sources', Globe2],
\n        ['Audit Trail', History],
\n    ] as const;
\n
\n    const scrollTo = (id: string) => {
\n        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
\n    };
\n
\n    const openWorkspace = (nextTab = 'Overview') => {
\n        setTab(nextTab);
\n        window.setTimeout(() => scrollTo('workspace'), 40);
\n    };
\n
\n    const verifiedCount = cases.filter((item) => item.humanVerified).length;
\n    const liveSources = sources.filter((item) => item.status === 'LIVE').length;
\n
\n    return (
\n        <div className='site'>
\n            <header className='site-header'>
\n                <div className='logo-ring' aria-label='We Do Care Global'>
\n                    <Globe2 size={27} strokeWidth={1.7} />
\n                    <HandHeart size={15} strokeWidth={1.8} className='logo-heart' />
\n                </div>
\n                <div className='header-row'>
\n                    <div className='wordmark'>
\n                        <b>WE DO CARE GLOBAL</b>
\n                        <span>PHARMACOVIGILANCE · REGULATORY INTELLIGENCE · AI GOVERNANCE</span>
\n                    </div>
\n                    <nav className='public-nav' aria-label='Primary'>
\n                        <a href='https://github.com/we-do-care-global' target='_blank' rel='noreferrer'>
\n                            Published <ArrowUpRight size={13} />
\n                        </a>
\n                        <button onClick={() => scrollTo('about')}>About</button>
\n                        <button onClick={() => scrollTo('contact')}>Contact</button>
\n                    </nav>
\n                </div>
\n            </header>
\n
\n            <main>
\n                <section className='hero reveal'>
\n                    <div className='hero-copy'>
\n                        <div className='eyebrow'>
\n                            <span className='pulse' />
\n                            WE DO CARE GLOBAL
\n                        </div>
\n                        <h1>
\n                            We Do Care Global
\n                            <span>Pharmacovigilance &amp; Regulatory Intelligence OS</span>
\n                        </h1>
\n                        <p className='hero-lede'>
\n                            A governed operational workspace connecting safety data, regulatory evidence,
\n                            retrieval intelligence and human-controlled AI decisions.
\n                        </p>
\n                        <div className='hero-meta'>
\n                            <span><strong>Human verified</strong> · Auditable · EU-ready</span>
\n                            <span>Global safety intelligence layer</span>
\n                            <span>ORCID 0009-0009-8515-2727</span>
\n                        </div>
\n                        <div className='hero-actions'>
\n                            <button className='btn btn-gold' onClick={() => openWorkspace('Overview')}>
\n                                Explore Platform <ArrowUpRight size={15} />
\n                            </button>
\n                            <button className='btn btn-ghost' onClick={() => scrollTo('about')}>
\n                                About the architecture
\n                            </button>
\n                        </div>
\n                    </div>
\n
\n                    <div className='hero-orbit' aria-label='Platform status'>
\n                        <div className='orbit-core'>
\n                            <ShieldCheck size={30} />
\n                            <b>TRUST</b>
\n                            <span>BY DESIGN</span>
\n                        </div>
\n                        <div className='orbit-node node-gold'>ICSR</div>
\n                        <div className='orbit-node node-cyan'>E2B(R3)</div>
\n                        <div className='orbit-node node-purple'>AI</div>
\n                        <div className='orbit-node node-red'>RISK</div>
\n                    </div>
\n                </section>
\n
\n                <section className='banner reveal' id='contact'>
\n                    <div>
\n                        <span className='banner-kicker'>ONE GOVERNED WORKSPACE</span>
\n                        <h2>
\n                            From safety data to governed action — one operational workspace for ICSR
\n                            intake, E2B(R3), signal detection, PSUR/PBRER, and human-controlled AI decisions.
\n                        </h2>
\n                    </div>
\n                    <button className='banner-cta' onClick={() => openWorkspace('ICSR / E2B')}>
\n                        Request Demo <ArrowUpRight size={16} />
\n                    </button>
\n                </section>
\n
\n                <section className='section reveal' id='features'>
\n                    <div className='section-intro'>
\n                        <span className='section-kicker'>FEATURES</span>
\n                        <h2>Safety operations, wrapped in governance.</h2>
\n                        <p>
\n                            Designed for teams that need traceable decisions, regulator-aware workflows and
\n                            useful AI without removing human accountability.
\n                        </p>
\n                    </div>
\n
\n                    <div className='feature-grid'>
\n                        <FeatureCard
\n                            icon={<FileCheck2 />}
\n                            tone='gold'
\n                            title='Regulatory Control Plane'
\n                            text='E2B(R3) XML generation + validation workflow with a hard human approval gate before production submission.'
\n                            onLearn={() => openWorkspace('ICSR / E2B')}
\n                        />
\n                        <FeatureCard
\n                            icon={<AlertTriangle />}
\n                            tone='cyan'
\n                            title='Signal Management'
\n                            text='Reviewable signal analytics with PRR, ROR and trend indicators, plus a PSUR/PBRER working-draft engine.'
\n                            onLearn={() => openWorkspace('Signals')}
\n                        />
\n                        <FeatureCard
\n                            icon={<Brain />}
\n                            tone='purple'
\n                            title='AI Governance'
\n                            text='Machine-first analysis, provenance, append-only audit evidence and human-in-the-loop decisions.'
\n                            onLearn={() => openWorkspace('AI Governance')}
\n                        />
\n                        <FeatureCard
\n                            icon={<ShieldCheck />}
\n                            tone='red'
\n                            title='Compliance & Residency'
\n                            text='EU governance evidence, source provenance and residency controls without pretending to self-certify legal compliance.'
\n                            onLearn={() => openWorkspace('Sources')}
\n                        />
\n                    </div>
\n                </section>
\n
\n                <section className='stats-section reveal'>
\n                    <div className='stat'>
\n                        <b>{cases.length}</b>
\n                        <span>ICSR cases in workspace</span>
\n                    </div>
\n                    <div className='stat'>
\n                        <b>{signals.length}</b>
\n                        <span>signals calculated</span>
\n                    </div>
\n                    <div className='stat'>
\n                        <b>{verifiedCount}/{cases.length || 0}</b>
\n                        <span>human verified cases</span>
\n                    </div>
\n                    <div className='stat stat-wide'>
\n                        <b>EU</b>
\n                        <span>governance + residency mode</span>
\n                    </div>
\n                </section>
\n
\n                <section className='about section reveal' id='about'>
\n                    <div className='section-intro'>
\n                        <span className='section-kicker'>WE DO CARE PLATFORM FABRIC</span>
\n                        <h2>One brand. Four complementary control layers.</h2>
\n                        <p>
\n                            The product surface stays focused on pharmacovigilance while the wider We Do Care
\n                            ecosystem provides retrieval, evaluation and agent-governance foundations.
\n                        </p>
\n                    </div>
\n
\n                    <div className='fabric-grid'>
\n                        <div className='fabric-item'>
\n                            <span className='fabric-dot gold' />
\n                            <div>
\n                                <b>Pharmacovigilance OS</b>
\n                                <p>ICSR, E2B(R3), signal management, PSUR/PBRER and regulatory source control.</p>
\n                            </div>
\n                        </div>
\n                        <div className='fabric-item'>
\n                            <span className='fabric-dot cyan' />
\n                            <div>
\n                                <b>Enterprise Hybrid RAG</b>
\n                                <p>Retrieval fabric for grounded answers across multimodal enterprise knowledge.</p>
\n                            </div>
\n                            <a href='https://we-do-care-global.github.io/enterprise-hybrid-rag/' target='_blank' rel='noreferrer'>Explore →</a>
\n                        </div>
\n                        <div className='fabric-item'>
\n                            <span className='fabric-dot purple' />
\n                            <div>
\n                                <b>Agent Eval</b>
\n                                <p>Evaluation and observability for agent performance, tools, RAG quality and workflows.</p>
\n                            </div>
\n                            <a href='https://we-do-care-global.github.io/agent-eval/#quickstart' target='_blank' rel='noreferrer'>Explore →</a>
\n                        </div>
\n                        <div className='fabric-item'>
\n                            <span className='fabric-dot red' />
\n                            <div>
\n                                <b>AgentGuard</b>
\n                                <p>Policy, approval, audit and kill-switch controls for autonomous AI actions.</p>
\n                            </div>
\n                            <a href='https://we-do-care-global.github.io/agentguard/' target='_blank' rel='noreferrer'>Explore →</a>
\n                        </div>
\n                    </div>
\n                </section>
\n
\n                <section className='workspace-wrap reveal' id='workspace'>
\n                    <div className='workspace-top'>
\n                        <div>
\n                            <span className='section-kicker'>LIVE WORKSPACE</span>
\n                            <h2>Operational console</h2>
\n                            <p>Public-facing surface above. Decision-ready execution below.</p>
\n                        </div>
\n                        <div className='workspace-actions'>
\n                            <span className='mini-status'><span className='pulse' /> {liveSources}/3 official sources live</span>
\n                            <button className='btn btn-ghost btn-small' onClick={refresh} disabled={busy}>
\n                                <RefreshCw size={14} className={busy ? 'spin' : ''} /> Refresh
\n                            </button>
\n                        </div>
\n                    </div>
\n
\n                    <div className='workspace-nav'>
\n                        {nav.map(([name, Icon]) => (
\n                            <button key={name} onClick={() => setTab(name)} className={tab === name ? 'active' : ''}>
\n                                <Icon size={15} />
\n                                <span>{name}</span>
\n                            </button>
\n                        ))}
\n                    </div>
\n
\n                    {notice && (
\n                        <div className='notice'>
\n                            <Sparkles size={15} />
\n                            {notice}
\n                        </div>
\n                    )}
\n
\n                    {tab === 'Overview' && (
\n                        <div className='workspace-panel'>
\n                            <div className='panel-grid'>
\n                                <Panel title='Machine-first, human-verified' kicker='CONTROL'>
\n                                    <p>
\n                                        AI extracts clinical elements, dates, seriousness and
\n                                        dechallenge/rechallenge candidates. A pharmacovigilance professional
\n                                        makes the final decision.
\n                                    </p>
\n                                    <div className='flow'>
\n                                        <span>Narrative</span><b>→</b><span>AI extraction</span><b>→</b>
\n                                        <span>PV review</span><b>→</b><span>Regulatory action</span>
\n                                    </div>
\n                                </Panel>
\n                                <Panel title='Regulatory readiness' kicker='READINESS'>
\n                                    <Readiness label='E2B(R3) XML workflow' state='READY' />
\n                                    <Readiness label='EMA production gateway' state='GATED' />
\n                                    <Readiness label='Signal management' state='READY' />
\n                                    <Readiness label='PSUR/PBRER draft engine' state='READY' />
\n                                    <Readiness label='AI governance evidence' state='READY' />
\n                                </Panel>
\n                            </div>
\n                        </div>
\n                    )}
\n
\n                    {tab === 'ICSR / E2B' && (
\n                        <WorkspaceView
\n                            title='ICSR & E2B(R3)'
\n                            subtitle='Structured case processing with a hard human approval gate.'
\n                            action={
\n                                <button className='btn btn-gold btn-small' onClick={e2b} disabled={busy}>
\n                                    <Send size={14} /> Generate E2B(R3)
\n                                </button>
\n                            }
\n                        >
\n                            <div className='case-list'>
\n                                {cases.map((item) => (
\n                                    <div className='case-row' key={item.id}>
\n                                        <div>
\n                                            <b>{item.id}</b>
\n                                            <span>{item.drug} · {item.reaction} · {item.seriousness}</span>
\n                                        </div>
\n                                        <div className='case-ai'><Brain size={13} /> {item.aiConfidence}% AI confidence</div>
\n                                        <div className={item.humanVerified ? 'verified' : 'pending'}>
\n                                            {item.humanVerified ? 'HUMAN VERIFIED' : 'AWAITING HUMAN'}
\n                                        </div>
\n                                        {!item.humanVerified && (
\n                                            <button className='micro-btn' onClick={() => verifyCase(item.id)}>
\n                                                <CheckCircle2 size={12} /> Verify
\n                                            </button>
\n                                        )}
\n                                    </div>
\n                                ))}
\n                            </div>
\n                            <div className='xml-card'>
\n                                <FileCheck2 />
\n                                <div>
\n                                    <b>ISO/ICH E2B(R3) validation package</b>
\n                                    <p>
\n                                        Generates a standards-oriented XML package and validation report. Production
\n                                        transmission stays registration-gated.
\n                                    </p>
\n                                </div>
\n                            </div>
\n                        </WorkspaceView>
\n                    )}
\n
\n                    {tab === 'Signals' && (
\n                        <WorkspaceView
\n                            title='Signal management'
\n                            subtitle='Disproportionality analytics with reviewable evidence.'
\n                            action={
\n                                <button className='btn btn-gold btn-small' onClick={runSignal} disabled={busy}>
\n                                    <Zap size={14} /> Recalculate
\n                                </button>
\n                            }
\n                        >
\n                            <div className='signal-grid'>
\n                                {(signals.length
\n                                    ? signals
\n                                    : [{
\n                                        title: 'Cardiac dysfunction / trastuzumab',
\n                                        severity: 'HIGH',
\n                                        source: 'ICSR workspace',
\n                                        country: 'EU',
\n                                        impact: 'Review for potential signal',
\n                                        prr: 4.21,
\n                                        ror: 4.08,
\n                                        trend: 'RISING',
\n                                        created_at: Date.now(),
\n                                    }]).map((item, index) => (
\n                                        <div className='signal' key={item.id || index}>
\n                                            <div className='signal-top'>
\n                                                <span className={'sev ' + item.severity.toLowerCase()}>{item.severity}</span>
\n                                                <b>{item.title}</b>
\n                                            </div>
\n                                            <div className='signal-stats'>
\n                                                <span>PRR <strong>{item.prr.toFixed(2)}</strong></span>
\n                                                <span>ROR <strong>{item.ror.toFixed(2)}</strong></span>
\n                                                <span>TREND <strong>{item.trend}</strong></span>
\n                                            </div>
\n                                            <small>{item.country} · {item.source} · {item.impact}</small>
\n                                        </div>
\n                                    ))}
\n                            </div>
\n                        </WorkspaceView>
\n                    )}
\n
\n                    {tab === 'Reports' && (
\n                        <WorkspaceView
\n                            title='PSUR / PBRER workspace'
\n                            subtitle='Generate a structured working draft, then route it through regulatory review.'
\n                            action={
\n                                <button className='btn btn-gold btn-small' onClick={generateReport} disabled={busy}>
\n                                    <FileText size={14} /> Generate draft
\n                                </button>
\n                            }
\n                        >
\n                            <div className='report-grid'>
\n                                <Report title='PSUR' desc='Periodic safety update structure with benefit-risk narrative, signal overview and ICSR evidence.' />
\n                                <Report title='PBRER' desc='Benefit-risk evaluation structure with cumulative safety data and action tracking.' />
\n                            </div>
\n                            <div className='review-banner'>
\n                                <ClipboardCheck />
\n                                <div>
\n                                    <b>Human sign-off required</b>
\n                                    <p>Generated text is a working draft, not a submitted regulatory report.</p>
\n                                </div>
\n                            </div>
\n                        </WorkspaceView>
\n                    )}
\n
\n                    {tab === 'AI Governance' && (
\n                        <WorkspaceView title='Trustworthy AI control room' subtitle='Evidence for human oversight, transparency, validation and accountability.'>
\n                            <div className='govern-grid'>
\n                                <Readiness label='Human oversight' state='ENABLED' />
\n                                <Readiness label='Model output provenance' state='TRACKED' />
\n                                <Readiness label='Decision audit trail' state='APPEND-ONLY' />
\n                                <Readiness label='Risk & limitation disclosure' state='ACTIVE' />
\n                                <Readiness label='EU AI Act evidence pack' state='WORKSPACE' />
\n                                <Readiness label='Data residency policy' state='EU REGION' />
\n                            </div>
\n                            <p className='muted'>
\n                                The system supports governance evidence. It does not self-certify legal compliance
\n                                or replace qualified regulatory, privacy or AI compliance assessment.
\n                            </p>
\n                        </WorkspaceView>
\n                    )}
\n
\n                    {tab === 'Sources' && (
\n                        <WorkspaceView
\n                            title='Official source control plane'
\n                            subtitle='Source-backed status, not decorative “LIVE” labels.'
\n                            action={
\n                                <button className='btn btn-ghost btn-small' onClick={refresh} disabled={busy}>
\n                                    <RefreshCw size={14} /> Refresh
\n                                </button>
\n                            }
\n                        >
\n                            <div className='source-list'>
\n                                {sources.map((item) => (
\n                                    <div className='source' key={item.id}>
\n                                        <div>
\n                                            <b>{item.name}</b>
\n                                            <span>{item.region} · {item.message}</span>
\n                                        </div>
\n                                        <div className={'source-status ' + item.status.toLowerCase()}>{item.status}</div>
\n                                        <a href={item.url} target='_blank' rel='noreferrer'>Official source</a>
\n                                    </div>
\n                                ))}
\n                            </div>
\n                        </WorkspaceView>
\n                    )}
\n
\n                    {tab === 'Audit Trail' && (
\n                        <WorkspaceView title='Append-only audit trail' subtitle='Every AI, human and regulatory workflow action leaves evidence.'>
\n                            <div className='audit-list'>
\n                                {(audits.length
\n                                    ? audits
\n                                    : [{
\n                                        actor: 'system',
\n                                        action: 'workspace_initialized',
\n                                        entity: 'pharma-dashboard',
\n                                        timestamp: Date.now(),
\n                                        hash: 'demo-evidence',
\n                                    }]).slice(0, 20).map((item, index) => (
\n                                    <div className='audit' key={item.id || index}>
\n                                        <History size={14} />
\n                                        <div>
\n                                            <b>{item.action}</b>
\n                                            <span>{item.actor} · {item.entity}</span>
\n                                        </div>
\n                                        <code>{item.hash}</code>
\n                                    </div>
\n                                ))}
\n                            </div>
\n                        </WorkspaceView>
\n                    )}
\n                </section>
\n
\n
{tab === 'FDA Approvals' && (
  <WorkspaceView
    title='FDA Drug Approvals'
    subtitle='Recent prescription drug approvals from openFDA (premium module)'
    action={
      <button className='btn btn-ghost btn-small' onClick={refresh} disabled={busy}>
        <RefreshCw size={14} /> Refresh
      </button>
    }
  >
    {approvalsLoading ? (<p>Loading approvals...</p>) : approvalsError ? (<p className='error'>Error: {approvalsError}</p>) : (<>
      <div className='approvals-table'>
        <table>
          <thead>
            <tr>
              <th>Drug Name</th>
              <th>Approval Date</th>
              <th>Indication</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((approval, idx) => (
              const approvalDate = approval.approval_date?.substring(0, 4) + '-' + approval.approval_date?.substring(4, 6) + '-' + approval.approval_date?.substring(6, 8) || '';
              const isNew = approvalDate && new Date(approvalDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
              return (<tr key={approval.id}>
                <td>{approval.drug_name}</td>
                <td>{approvalDate}</td>
                <td>{approval.indication}</td>
                <td>
                  {isNew && (<span className='badge badge-new'>New</span>)};
                  {!isNew && (<span className='badge badge-old'>Existing</span>)};
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </WorkspaceView>
)\n                <footer className='footer'>
\n                    <div>
\n                        <b>We Do Care Global</b>
\n                        <span>Pharmacovigilance &amp; Regulatory Intelligence OS</span>
\n                    </div>
\n                    <div className='footer-links'>
\n                        <button onClick={() => scrollTo('about')}>About</button>
\n                        <button onClick={() => scrollTo('contact')}>Contact</button>
\n                        <a href='https://github.com/we-do-care-global' target='_blank' rel='noreferrer'>GitHub</a>
\n                        <a href='https://orcid.org/0009-0009-8515-2727' target='_blank' rel='noreferrer'>ORCID</a>
\n                    </div>
\n                    <div className='footer-note'>© 2026 We Do Care Global · Apache 2.0 · EU governance workspace</div>
\n                </footer>
\n            </main>
\n        </div>
\n    );
\n}
\n
\nfunction FeatureCard({
\n    icon,
\n    tone,
\n    title,
\n    text,
\n    onLearn,
\n}: {
\n    icon: React.ReactNode;
\n    tone: string;
\n    title: string;
\n    text: string;
\n    onLearn: () => void;
\n}) {
\n    return (
\n        <article className={'feature-card ' + tone}>
\n            <div className='feature-icon'>{icon}</div>
\n            <h3>{title}</h3>
\n            <p>{text}</p>
\n            <button onClick={onLearn}>Learn more <ArrowUpRight size={13} /></button>
\n        </article>
\n    );
\n}
\n
\nfunction Panel({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
\n    return (
\n        <div className='panel'>
\n            <span className='section-kicker'>{kicker}</span>
\n            <h3>{title}</h3>
\n            {children}
\n        </div>
\n    );
\n}
\n
\nfunction WorkspaceView({
\n    title,
\n    subtitle,
\n    action,
\n    children,
\n}: {
\n    title: string;
\n    subtitle: string;
\n    action?: React.ReactNode;
\n    children: React.ReactNode;
\n}) {
\n    return (
\n        <div className='workspace-view'>
\n            <div className='workspace-head'>
\n                <div>
\n                    <span className='section-kicker'>WE DO CARE GLOBAL</span>
\n                    <h3>{title}</h3>
\n                    <p>{subtitle}</p>
\n                </div>
\n                {action}
\n            </div>
\n            {children}
\n        </div>
\n    );
\n}
\n
\nfunction Readiness({ label, state }: { label: string; state: string }) {
\n    return (
\n        <div className='readiness'>
\n            <span>{label}</span>
\n            <b>{state}</b>
\n        </div>
\n    );
\n}
\n
\nfunction Report({ title, desc }: { title: string; desc: string }) {
\n    return (
\n        <div className='report'>
\n            <FileText size={18} />
\n            <div>
\n                <b>{title}</b>
\n                <p>{desc}</p>
\n                <span>WORKING DRAFT · HUMAN REVIEW</span>
\n            </div>
\n        </div>
\n    );
\n}
\n
\nexport default App;
