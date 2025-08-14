import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Type } from "@google/genai";

// Ensure you have Chart.js, jsPDF, and html2canvas types if you need full type safety
declare const Chart: any;
declare const jspdf: any;
declare const html2canvas: any;

type Platform = "web" | "whatsapp" | "telegram";
type AppState =
    | "loading"
    | "welcome-back"
    | "platform-select"
    | "language-select"
    | "survey-running"
    | "survey-complete"
    | "report-generating"
    | "report-view";


const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [ai, setAi] = useState<GoogleGenAI | null>(null);

    useEffect(() => {
        const key = process.env.API_KEY;
        if (key) {
            setApiKey(key);
            setAi(new GoogleGenAI({ apiKey: key }));
        }
    }, []);

    const [appState, setAppState] = useState<AppState>("loading");
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>("web");
    const [selectedLanguage, setSelectedLanguage] = useState<string>("");
    const [languageSearchTerm, setLanguageSearchTerm] = useState<string>("");
    const [messages, setMessages] = useState<{ sender: "bot" | "user"; text: string }[]>([]);
    const [surveyResponses, setSurveyResponses] = useState<{ question: string; answer: string }[]>([]);
    const [reportData, setReportData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [userInput, setUserInput] = useState<string>("");
    
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    // Check for saved report on initial load
    useEffect(() => {
        try {
            const savedReport = localStorage.getItem('savedReport');
            if (savedReport) {
                setAppState('welcome-back');
            } else {
                setAppState('platform-select');
            }
        } catch (error) {
            console.error("Could not access local storage:", error);
            setAppState('platform-select');
        }
    }, []);


    const languages = [
        { code: 'English', name: 'English' },
        { code: 'Spanish', name: 'Español' },
        { code: 'French', name: 'Français' },
        { code: 'German', name: 'Deutsch' },
        { code: 'Mandarin Chinese', name: '中文 (普通话)' },
        { code: 'Hindi', name: 'हिन्दी' },
        { code: 'Arabic', name: 'العربية' },
        { code: 'Portuguese', name: 'Português' },
        { code: 'Bengali', name: 'বাংলা' },
        { code: 'Russian', name: 'Русский' },
        { code: 'Japanese', name: '日本語' },
        { code: 'Punjabi', name: 'ਪੰਜਾਬੀ' },
        { code: 'Korean', name: '한국어' },
        { code: 'Vietnamese', name: 'Tiếng Việt' },
        { code: 'Telugu', name: 'తెలుగు' },
        { code: 'Marathi', name: 'मराठी' },
        { code: 'Turkish', name: 'Türkçe' },
        { code: 'Tamil', name: 'தமிழ்' },
        { code: 'Italian', name: 'Italiano' },
        { code: 'Urdu', name: 'اردو' },
        { code: 'Persian', name: 'فارسی' },
        { code: 'Gujarati', name: 'ગુજરાતી' },
        { code: 'Polish', name: 'Polski' },
        { code: 'Ukrainian', name: 'Українська' },
        { code: 'Malayalam', name: 'മലയാളം' },
        { code: 'Kannada', name: 'ಕನ್ನಡ' },
        { code: 'Thai', name: 'ไทย' },
        { code: 'Dutch', name: 'Nederlands' },
        { code: 'Greek', name: 'Ελληνικά' },
        { code: 'Czech', name: 'Čeština' },
        { code: 'Swedish', name: 'Svenska' },
        { code: 'Romanian', name: 'Română' },
        { code: 'Hungarian', name: 'Magyar' },
        { code: 'Hebrew', name: 'עברית' },
        { code: 'Indonesian', name: 'Bahasa Indonesia' }
    ];

    const filteredLanguages = languages.filter(lang => 
        lang.name.toLowerCase().includes(languageSearchTerm.toLowerCase()) || 
        lang.code.toLowerCase().includes(languageSearchTerm.toLowerCase())
    );

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (appState === 'report-view' && reportData?.chartData && chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            const ctx = chartRef.current.getContext('2d');
            if (!ctx) return;

            const { labels, values, title } = reportData.chartData;
            if(!labels || !values || labels.length === 0 || values.length === 0) return;

            chartInstance.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: title,
                        data: values,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    maintainAspectRatio: false,
                }
            });
        }
    }, [reportData, appState]);

    const handlePlatformSelect = (platform: Platform) => {
        setSelectedPlatform(platform);
        setAppState("language-select");
    };
    
    const handleLanguageSelect = (lang: string) => {
        setSelectedLanguage(lang);
    };

    const startSurvey = async () => {
        if (!ai || !selectedLanguage) return;
        setAppState("survey-running");
        setIsLoading(true);

        const systemInstruction = `You are a friendly and helpful 'Personal Needs & Goals Assistant'. Your goal is to understand what the user needs or wants to accomplish. The survey consists of 5 questions. You must ask adaptive questions based on the user's previous answers. Your responses must always be in ${selectedLanguage}. Start with a friendly greeting and ask the first question to understand the user's primary goal or need right now.`;
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: "Please start the survey now.",
                config: { systemInstruction }
            });
            const text = response.text;
            setMessages([{ sender: "bot", text }]);
        } catch (error) {
            console.error("Error starting survey:", error);
            setMessages([{ sender: "bot", text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading || !ai) return;

        const newUserMessage = { sender: "user" as const, text: userInput };
        const newMessages = [...messages, newUserMessage];
        setMessages(newMessages);

        const currentQuestion = messages.filter(m => m.sender === 'bot').pop()?.text || "";
        setSurveyResponses(prev => [...prev, { question: currentQuestion, answer: userInput }]);
        setUserInput("");
        setIsLoading(true);

        const conversationHistory = newMessages.map(m => `${m.sender}: ${m.text}`).join('\n');
        const questionCount = surveyResponses.length;
        
        const systemInstruction = `You are a friendly and helpful 'Personal Needs & Goals Assistant'. Your goal is to understand what the user needs or wants to accomplish. The survey consists of 5 questions. You must ask adaptive questions based on the user's previous answers. Your responses must always be in ${selectedLanguage}. You have asked ${questionCount} questions so far. Based on the conversation history, ask the next relevant question to get more clarity on their needs. If the survey is complete (5 questions asked), thank the user and tell them you will now summarize their needs.`;
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Conversation History:\n${conversationHistory}\n\nAsk the next question.`,
                config: { systemInstruction }
            });
            const text = response.text;
            setMessages(prev => [...prev, { sender: 'bot', text }]);
            if (questionCount >= 4) {
                setAppState("survey-complete");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, an error occurred.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!ai) return;
        setAppState("report-generating");
        
        const reportPrompt = `Analyze the following conversation where a user describes their needs and goals. Generate a personal action plan report based on their responses. The entire report, including all keys and string values in the JSON, must be in ${selectedLanguage}. 
The report must include:
1. A concise title (e.g., 'Your Personal Action Plan').
2. A one-paragraph summary of their stated needs.
3. A detailed analysis section. This should be an array where each item contains the original question, the user's answer, and a concise insight or analysis of that specific exchange.
4. A brief conclusion with encouragement.
5. Identify any quantifiable data suitable for a simple bar chart (like priority levels, or estimated timeframes). If no clear numerical data is found, provide an empty array for chartData labels and values. 
Conversation responses:\n${JSON.stringify(surveyResponses, null, 2)}`;

        const schema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                detailedAnalysis: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            answer: { type: Type.STRING },
                            insight: { type: Type.STRING },
                        },
                        required: ['question', 'answer', 'insight']
                    }
                },
                conclusion: { type: Type.STRING },
                chartData: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                        values: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    },
                },
            },
            required: ['title', 'summary', 'detailedAnalysis', 'conclusion', 'chartData']
        };
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: reportPrompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: schema
                }
            });
            const reportJson = JSON.parse(response.text);

            localStorage.setItem('savedReport', JSON.stringify(reportJson));
            localStorage.setItem('savedSurveyResponses', JSON.stringify(surveyResponses));

            setReportData(reportJson);
            setAppState("report-view");
        } catch(error) {
            console.error("Error generating report:", error);
            setAppState("survey-complete"); // Revert state on error
        }
    };
    
    const downloadCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,Question,Answer\n";
        surveyResponses.forEach(row => {
            csvContent += `"${row.question.replace(/"/g, '""')}","${row.answer.replace(/"/g, '""')}"\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "survey_responses.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadPDF = () => {
        const reportElement = document.getElementById("report-content");
        if (reportElement) {
            const originalBackgroundColor = reportElement.style.backgroundColor;
            reportElement.style.backgroundColor = '#1e1e1e'; // Ensure bg for capture

            html2canvas(reportElement).then((canvas: any) => {
                reportElement.style.backgroundColor = originalBackgroundColor;
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = jspdf;
                const pdf = new jsPDF();
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save("survey_report.pdf");
            });
        }
    };

    const loadAndShowReport = () => {
        try {
            const savedReport = localStorage.getItem('savedReport');
            const savedResponses = localStorage.getItem('savedSurveyResponses');
            if (savedReport && savedResponses) {
                setReportData(JSON.parse(savedReport));
                setSurveyResponses(JSON.parse(savedResponses));
                setAppState('report-view');
            }
        } catch (error) {
            console.error("Failed to load saved report:", error);
            clearSavedDataAndStartOver();
        }
    };
    
    const clearSavedDataAndStartOver = () => {
        try {
            localStorage.removeItem('savedReport');
            localStorage.removeItem('savedSurveyResponses');
        } catch (error) {
            console.error("Failed to clear saved data:", error);
        }
        setReportData(null);
        setSurveyResponses([]);
        setMessages([]);
        setSelectedLanguage("");
        setUserInput("");
        setLanguageSearchTerm("");
        setAppState('platform-select');
    };


    if (!apiKey) {
        return <div className="container"><p className="error">API_KEY environment variable not set.</p></div>;
    }

    if (appState === 'loading') {
        return (
            <div className="container">
                <div className="loading-report">
                    <div className="spinner"></div>
                </div>
            </div>
        )
    }

    const renderChatHeader = () => {
        switch(selectedPlatform) {
            case 'whatsapp':
                return (
                    <div className="chat-header">
                        <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12.036 6.992a.75.75 0 0 1 .75.75v3.518l2.47-2.47a.75.75 0 0 1 1.06 1.06l-2.47 2.47h3.518a.75.75 0 0 1 0 1.5h-3.518l2.47 2.47a.75.75 0 1 1-1.06 1.06l-2.47-2.47v3.518a.75.75 0 0 1-1.5 0v-3.518l-2.47 2.47a.75.75 0 0 1-1.06-1.06l2.47-2.47H6.222a.75.75 0 0 1 0-1.5h3.518l-2.47-2.47a.75.75 0 0 1 1.06-1.06l2.47 2.47V7.742a.75.75 0 0 1 .75-.75Z"></path></svg>
                        <div className="chat-header-text">
                            <h3>Goals Assistant</h3>
                            <p>online</p>
                        </div>
                    </div>
                );
            case 'telegram':
                return (
                    <div className="chat-header">
                         <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"></path></svg>
                        <div className="chat-header-text">
                            <h3>Goals Assistant Bot</h3>
                             <p>bot</p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };


    return (
        <div className="container" data-theme={selectedPlatform}>
            <header>
                <h1>AI-Powered Personal Survey</h1>
            </header>
            <main>
                {appState === "welcome-back" && (
                     <div className="card welcome-back">
                        <h2>Welcome Back!</h2>
                        <p>You have a previously generated report.</p>
                        <div className="welcome-back-actions">
                            <button className="cta-btn" onClick={loadAndShowReport}>View Last Report</button>
                            <button className="cta-btn secondary" onClick={clearSavedDataAndStartOver}>Start New Survey</button>
                        </div>
                    </div>
                )}
                
                {appState === "platform-select" && (
                     <div className="card platform-selection">
                        <h2>Choose Your Experience</h2>
                        <div className="platform-buttons">
                             <button onClick={() => handlePlatformSelect('web')}>
                                <span>Web App</span>
                            </button>
                             <button onClick={() => handlePlatformSelect('whatsapp')}>
                                <span>WhatsApp</span>
                             </button>
                             <button onClick={() => handlePlatformSelect('telegram')}>
                                 <span>Telegram</span>
                            </button>
                        </div>
                    </div>
                )}


                {appState === "language-select" && (
                    <div className="card language-selection">
                        <button className="back-btn" onClick={() => setAppState('platform-select')}>&larr; Back</button>
                        <h2>Select Your Language</h2>
                        <input
                            type="text"
                            placeholder="Search for a language..."
                            className="language-search-input"
                            value={languageSearchTerm}
                            onChange={(e) => setLanguageSearchTerm(e.target.value)}
                        />
                        <div className="language-buttons">
                            {filteredLanguages.map(lang => (
                                <button
                                    key={lang.code}
                                    className={`lang-btn ${selectedLanguage === lang.code ? "selected" : ""}`}
                                    onClick={() => handleLanguageSelect(lang.code)}
                                >
                                    {lang.name}
                                </button>
                            ))}
                        </div>
                        <button className="cta-btn" onClick={startSurvey} disabled={!selectedLanguage}>
                            Start Survey
                        </button>
                    </div>
                )}

                {(appState === "survey-running" || appState === "survey-complete") && (
                    <div className="chat-container">
                        {renderChatHeader()}
                        <div className="chat-window">
                            {messages.map((msg, index) => (
                                <div key={index} className={`chat-message ${msg.sender}`}>
                                    <p>{msg.text}</p>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="chat-message bot">
                                    <div className="typing-indicator">
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={handleSendMessage} className="chat-input-form">
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Type your answer..."
                                disabled={isLoading || appState === 'survey-complete'}
                            />
                            <button type="submit" disabled={isLoading || appState === 'survey-complete'}>Send</button>
                        </form>
                    </div>
                )}
                
                {appState === "survey-complete" && (
                     <button className="cta-btn report-btn" onClick={handleGenerateReport}>
                        Generate Report
                    </button>
                )}

                {(appState === "report-generating" || appState === "report-view") && (
                    <div className="card report-container">
                        {appState === 'report-generating' ? (
                             <div className="loading-report">
                                <div className="spinner"></div>
                                <p>Analyzing responses and generating your report...</p>
                            </div>
                        ) : (
                            reportData && (
                                <>
                                <div id="report-content">
                                    <h2>{reportData.title}</h2>
                                    <div className="report-section">
                                        <h3>Summary</h3>
                                        <p>{reportData.summary}</p>
                                    </div>
                                     {reportData.detailedAnalysis && (
                                        <div className="report-section">
                                            <h3>Detailed Analysis</h3>
                                            {reportData.detailedAnalysis.map((item: any, index: number) => (
                                                <div key={index} className="detailed-analysis-item">
                                                    <h4>{`Q${index + 1}: ${item.question}`}</h4>
                                                    <p className="analysis-answer">{`A: ${item.answer}`}</p>
                                                    <p className="analysis-insight">{`💡 Insight: ${item.insight}`}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {reportData.chartData?.labels?.length > 0 && (
                                         <div className="report-section chart-section">
                                            <h3>Data Visualization</h3>
                                            <div className="chart-wrapper">
                                              <canvas ref={chartRef}></canvas>
                                            </div>
                                        </div>
                                    )}
                                    <div className="report-section">
                                        <h3>Conclusion</h3>
                                        <p>{reportData.conclusion}</p>
                                    </div>
                                </div>
                                <div className="report-actions">
                                    <button className="cta-btn" onClick={downloadPDF}>Download PDF</button>
                                    <button className="cta-btn secondary" onClick={downloadCSV}>Download CSV</button>
                                    <button className="cta-btn secondary" onClick={clearSavedDataAndStartOver}>Start New Survey</button>
                                </div>
                                </>
                            )
                        )}
                    </div>
                )}

            </main>
        </div>
    );
};

const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}