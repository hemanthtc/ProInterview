import React, { useState, useEffect, useCallback } from "react";
import { 
    Folder, FileText, Plus, Trash2, Save, RefreshCw, 
    BookOpen, ChevronRight, AlertCircle, CheckCircle2,
    Eye, Edit, Loader2, Upload
} from "lucide-react";

interface Subject {
    id: string;
    name: string;
    color: number;
    desc: string;
}

interface Chapter {
    id: string;
    title: string;
    desc: string;
    icon: string;
    badge: string;
    hasPdf?: boolean;
}

interface Course {
    id: string;
    name: string;
    icon: string;
    themeColor: string;
    subjects: Subject[];
    chapters: Record<string, {
        title: string;
        subtitle: string;
        rows: {
            title: string;
            chapters: Chapter[];
        }[];
    }>;
}

interface Group {
    name: string;
    icon: string;
    courses: Course[];
}

interface PageContent {
    left: { title: string; content: string };
    right: { title: string; content: string };
}

export default function StudyMaterialsManager() {
    const [catalog, setCatalog] = useState<Group[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const [s3Configured, setS3Configured] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    // Selected state
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

    // Chapter pages state
    const [pages, setPages] = useState<PageContent[]>([]);
    const [loadingPages, setLoadingPages] = useState(false);
    const [savingPages, setSavingPages] = useState(false);
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [deletingPdf, setDeletingPdf] = useState(false);

    // Form modals state
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [showAddSubject, setShowAddSubject] = useState(false);
    const [showAddChapter, setShowAddChapter] = useState(false);

    // Form inputs
    const [newCourse, setNewCourse] = useState({ id: "", name: "", icon: "💻", themeColor: "#10b981", groupName: "Engineering" });
    const [newSubject, setNewSubject] = useState({ id: "", name: "", color: "440020", desc: "" });
    const [newChapter, setNewChapter] = useState({ id: "", title: "", desc: "", icon: "📚", badge: "Core", rowTitle: "Core Materials" });

    const showMsg = useCallback((text: string, type: "success" | "error") => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 5000);
    }, []);

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedCourse || !selectedSubject || !selectedChapter) return;

        setUploadingPdf(true);
        const formData = new FormData();
        formData.append("courseId", selectedCourse.id);
        formData.append("subjectId", selectedSubject.id);
        formData.append("chapterId", selectedChapter.id);
        formData.append("pdf", file);

        try {
            const res = await fetch("/api/admin/study-materials/upload-pdf", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                showMsg("PDF document uploaded successfully to S3.", "success");
                // Update local catalog to show PDF is active
                const updatedCatalog = JSON.parse(JSON.stringify(catalog)) as Group[];
                for (const group of updatedCatalog) {
                    for (const course of group.courses) {
                        if (course.id === selectedCourse.id) {
                            const subChapters = course.chapters[selectedSubject.id];
                            if (subChapters && subChapters.rows) {
                                subChapters.rows.forEach((r: any) => {
                                    r.chapters.forEach((ch: any) => {
                                        if (ch.id === selectedChapter.id) {
                                            ch.hasPdf = true;
                                        }
                                    });
                                });
                            }
                        }
                    }
                }
                setCatalog(updatedCatalog);
                // Force update selected chapter details so the UI updates
                setSelectedChapter({
                    ...selectedChapter,
                    hasPdf: true
                });
            } else {
                showMsg(data.error || "Failed to upload PDF.", "error");
            }
        } catch (err) {
            showMsg("Error uploading PDF file.", "error");
        } finally {
            setUploadingPdf(false);
            e.target.value = "";
        }
    };

    const handleDeletePdf = async () => {
        if (!selectedCourse || !selectedSubject || !selectedChapter) return;
        if (!window.confirm("Are you sure you want to delete this PDF document? This will remove the document from S3.")) return;

        setDeletingPdf(true);
        try {
            const res = await fetch(`/api/admin/study-materials/upload-pdf?courseId=${selectedCourse.id}&subjectId=${selectedSubject.id}&chapterId=${selectedChapter.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (res.ok) {
                showMsg("PDF document deleted successfully from S3.", "success");
                // Update local catalog to show PDF is inactive
                const updatedCatalog = JSON.parse(JSON.stringify(catalog)) as Group[];
                for (const group of updatedCatalog) {
                    for (const course of group.courses) {
                        if (course.id === selectedCourse.id) {
                            const subChapters = course.chapters[selectedSubject.id];
                            if (subChapters && subChapters.rows) {
                                subChapters.rows.forEach((r: any) => {
                                    r.chapters.forEach((ch: any) => {
                                        if (ch.id === selectedChapter.id) {
                                            ch.hasPdf = false;
                                        }
                                    });
                                });
                            }
                        }
                    }
                }
                setCatalog(updatedCatalog);
                // Update selected chapter state
                setSelectedChapter({
                    ...selectedChapter,
                    hasPdf: false
                });
            } else {
                showMsg(data.error || "Failed to delete PDF.", "error");
            }
        } catch (err) {
            showMsg("Error deleting PDF file.", "error");
        } finally {
            setDeletingPdf(false);
        }
    };

    const fetchCatalog = useCallback(async () => {
        setLoadingCatalog(true);
        try {
            const res = await fetch("/api/admin/study-materials");
            const data = await res.json();
            if (res.ok) {
                setCatalog(data.catalog || []);
                setS3Configured(data.s3Configured);
            } else {
                showMsg(data.error || "Failed to load catalog.", "error");
            }
        } catch (e) {
            showMsg("Error loading catalog.", "error");
        } finally {
            setLoadingCatalog(false);
        }
    }, [showMsg]);

    const fetchPages = useCallback(async (courseId: string, subjectId: string, chapterId: string) => {
        setLoadingPages(true);
        try {
            const res = await fetch(`/api/admin/study-materials/content?course=${courseId}&subject=${subjectId}&chapter=${chapterId}`);
            const data = await res.json();
            if (res.ok) {
                setPages(data.pages || []);
            } else {
                showMsg(data.error || "Failed to load chapter content.", "error");
            }
        } catch (e) {
            showMsg("Error loading pages.", "error");
        } finally {
            setLoadingPages(false);
        }
    }, [showMsg]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCatalog();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchCatalog]);

    useEffect(() => {
        if (selectedCourse && selectedSubject && selectedChapter) {
            const timer = setTimeout(() => {
                fetchPages(selectedCourse.id, selectedSubject.id, selectedChapter.id);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [selectedCourse, selectedSubject, selectedChapter, fetchPages]);

    const saveCatalog = async (updatedCatalog: Group[]) => {
        try {
            const res = await fetch("/api/admin/study-materials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ catalog: updatedCatalog }),
            });
            const data = await res.json();
            if (res.ok) {
                setCatalog(updatedCatalog);
                showMsg("Catalog folder structure updated successfully.", "success");
            } else {
                showMsg(data.error || "Failed to save catalog structure.", "error");
            }
        } catch (e) {
            showMsg("Error saving catalog to S3.", "error");
        }
    };

    const savePages = async () => {
        if (!selectedCourse || !selectedSubject || !selectedChapter) return;
        setSavingPages(true);
        try {
            const res = await fetch("/api/admin/study-materials/content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseId: selectedCourse.id,
                    subjectId: selectedSubject.id,
                    chapterId: selectedChapter.id,
                    pages,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                showMsg("Pages saved successfully to S3.", "success");
            } else {
                showMsg(data.error || "Failed to save pages.", "error");
            }
        } catch (e) {
            showMsg("Error saving pages content.", "error");
        } finally {
            setSavingPages(false);
        }
    };

    // Catalog Manipulation
    const handleAddCourse = () => {
        if (!newCourse.id || !newCourse.name) return;
        const updated = JSON.parse(JSON.stringify(catalog)) as Group[];
        let group = updated.find(g => g.name === newCourse.groupName);
        if (!group) {
            group = { name: newCourse.groupName, icon: "⚙️", courses: [] };
            updated.push(group);
        }
        
        const courseExist = group.courses.some(c => c.id === newCourse.id);
        if (courseExist) {
            showMsg("Course ID already exists in this group.", "error");
            return;
        }

        group.courses.push({
            id: newCourse.id,
            name: newCourse.name,
            icon: newCourse.icon,
            themeColor: newCourse.themeColor,
            subjects: [],
            chapters: {}
        });

        saveCatalog(updated);
        setShowAddCourse(false);
        setNewCourse({ id: "", name: "", icon: "💻", themeColor: "#10b981", groupName: "Engineering" });
    };

    const handleDeleteCourse = async (courseId: string, groupName: string) => {
        if (!confirm("Are you sure you want to delete this course folder and all its subjects, chapters, and content files from S3?")) return;
        
        // 1. Call S3 prefix deletion endpoint
        try {
            await fetch(`/api/admin/study-materials?prefix=study-materials/${courseId}/`, {
                method: "DELETE"
            });
        } catch(e) {
            console.error("Failed to delete course S3 prefix", e);
        }

        // 2. Remove from catalog index
        const updated = JSON.parse(JSON.stringify(catalog)) as Group[];
        const group = updated.find(g => g.name === groupName);
        if (group) {
            group.courses = group.courses.filter(c => c.id !== courseId);
            saveCatalog(updated);
        }
        
        if (selectedCourse?.id === courseId) {
            setSelectedCourse(null);
            setSelectedSubject(null);
            setSelectedChapter(null);
            setPages([]);
        }
    };

    const handleAddSubject = () => {
        if (!selectedCourse || !newSubject.id || !newSubject.name) return;
        const updated = JSON.parse(JSON.stringify(catalog)) as Group[];
        
        // Find selected course
        let course: Course | null = null;
        for (const g of updated) {
            const found = g.courses.find(c => c.id === selectedCourse.id);
            if (found) { course = found; break; }
        }

        if (!course) return;
        if (course.subjects.some(s => s.id === newSubject.id)) {
            showMsg("Subject ID already exists in this course.", "error");
            return;
        }

        const colorNum = parseInt(newSubject.color.replace("#", "0x")) || 440020;
        const subjectObj: Subject = {
            id: newSubject.id,
            name: newSubject.name,
            color: colorNum,
            desc: newSubject.desc
        };
        
        course.subjects.push(subjectObj);
        course.chapters[newSubject.id] = {
            title: `${newSubject.name} Library`,
            subtitle: `Reference manuals for ${newSubject.name.toLowerCase()} concepts`,
            rows: []
        };

        saveCatalog(updated);
        setSelectedCourse(course); // Update UI select
        setShowAddSubject(false);
        setNewSubject({ id: "", name: "", color: "440020", desc: "" });
    };

    const handleDeleteSubject = async (subjectId: string) => {
        if (!selectedCourse) return;
        if (!confirm("Are you sure you want to delete this subject folder and all its chapters and content files from S3?")) return;

        // 1. Delete S3 prefix files
        try {
            await fetch(`/api/admin/study-materials?prefix=study-materials/${selectedCourse.id}/${subjectId}/`, {
                method: "DELETE"
            });
        } catch(e) {
            console.error("Failed to delete subject S3 prefix", e);
        }

        // 2. Remove from catalog index
        const updated = JSON.parse(JSON.stringify(catalog)) as Group[];
        let course: Course | null = null;
        for (const g of updated) {
            const found = g.courses.find(c => c.id === selectedCourse.id);
            if (found) { course = found; break; }
        }

        if (course) {
            course.subjects = course.subjects.filter(s => s.id !== subjectId);
            delete course.chapters[subjectId];
            saveCatalog(updated);
            setSelectedCourse(course);
        }

        if (selectedSubject?.id === subjectId) {
            setSelectedSubject(null);
            setSelectedChapter(null);
            setPages([]);
        }
    };

    const handleAddChapter = () => {
        if (!selectedCourse || !selectedSubject || !newChapter.id || !newChapter.title) return;
        const updated = JSON.parse(JSON.stringify(catalog)) as Group[];
        
        // Find selected course
        let course: Course | null = null;
        for (const g of updated) {
            const found = g.courses.find(c => c.id === selectedCourse.id);
            if (found) { course = found; break; }
        }

        if (!course) return;
        const subjectChapters = course.chapters[selectedSubject.id];
        if (!subjectChapters) return;

        // Check duplicate
        let exists = false;
        subjectChapters.rows.forEach(r => {
            if (r.chapters.some(c => c.id === newChapter.id)) exists = true;
        });

        if (exists) {
            showMsg("Chapter ID already exists in this subject.", "error");
            return;
        }

        // Find or create row
        let row = subjectChapters.rows.find(r => r.title === newChapter.rowTitle);
        if (!row) {
            row = { title: newChapter.rowTitle, chapters: [] };
            subjectChapters.rows.push(row);
        }

        const chapterObj: Chapter = {
            id: newChapter.id,
            title: newChapter.title,
            desc: newChapter.desc,
            icon: newChapter.icon,
            badge: newChapter.badge
        };

        row.chapters.push(chapterObj);

        saveCatalog(updated);
        setSelectedCourse(course);
        setShowAddChapter(false);
        setNewChapter({ id: "", title: "", desc: "", icon: "📚", badge: "Core", rowTitle: "Core Materials" });
    };

    const handleDeleteChapter = async (chapterId: string, rowTitle: string) => {
        if (!selectedCourse || !selectedSubject) return;
        if (!confirm("Are you sure you want to delete this chapter folder and its content from S3?")) return;

        // 1. Delete S3 prefix files
        try {
            await fetch(`/api/admin/study-materials?prefix=study-materials/${selectedCourse.id}/${selectedSubject.id}/${chapterId}/`, {
                method: "DELETE"
            });
        } catch(e) {
            console.error("Failed to delete chapter S3 prefix", e);
        }

        // 2. Remove from catalog index
        const updated = JSON.parse(JSON.stringify(catalog)) as Group[];
        let course: Course | null = null;
        for (const g of updated) {
            const found = g.courses.find(c => c.id === selectedCourse.id);
            if (found) { course = found; break; }
        }

        if (course) {
            const subjectChapters = course.chapters[selectedSubject.id];
            if (subjectChapters) {
                subjectChapters.rows.forEach(r => {
                    if (r.title === rowTitle) {
                        r.chapters = r.chapters.filter(c => c.id !== chapterId);
                    }
                });
                // Clean empty rows
                subjectChapters.rows = subjectChapters.rows.filter(r => r.chapters.length > 0);
                saveCatalog(updated);
                setSelectedCourse(course);
            }
        }

        if (selectedChapter?.id === chapterId) {
            setSelectedChapter(null);
            setPages([]);
        }
    };

    // Page Content Manipulation
    const handleAddPage = () => {
        setPages([...pages, {
            left: { title: "New Page Left", content: "<p>Write content here...</p>" },
            right: { title: "New Page Right", content: "<p>Write content here...</p>" }
        }]);
    };

    const handleDeletePage = (index: number) => {
        if (!confirm(`Delete page ${index * 2 + 1} - ${index * 2 + 2}?`)) return;
        setPages(pages.filter((_, i) => i !== index));
    };

    const updatePageField = (pageIndex: number, side: "left" | "right", field: "title" | "content", value: string) => {
        const updated = [...pages];
        updated[pageIndex] = {
            ...updated[pageIndex],
            [side]: {
                ...updated[pageIndex][side],
                [field]: value
            }
        };
        setPages(updated);
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-400" />
                        Study Materials (S3 Storage)
                    </h2>
                    <p className="text-xs text-white/50 mt-1">
                        Manage static courses, subjects, chapters, and dynamic reading content hosted on AWS S3.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${s3Configured ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" : "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s3Configured ? "bg-emerald-400" : "bg-amber-400"}`} />
                        {s3Configured ? "S3 Connected" : "S3 Offline (Read-Only Seed)"}
                    </span>
                    <button onClick={fetchCatalog} className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 transition-colors" title="Reload Folder Catalog">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${message.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    {message.type === "success" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            {loadingCatalog ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-white/10 rounded-2xl">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    <span className="text-sm text-white/40 mt-3 font-medium">Loading S3 bucket catalog...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column: Explorer Tree */}
                    <div className="lg:col-span-4 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <span className="text-xs font-bold uppercase text-white/40 tracking-wider">Courses Catalog</span>
                            <button 
                                onClick={() => setShowAddCourse(true)} 
                                disabled={!s3Configured}
                                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 disabled:opacity-40 disabled:hover:bg-indigo-600/20 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" /> Course
                            </button>
                        </div>

                        {/* List Courses */}
                        {catalog.map(group => (
                            <div key={group.name} className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-white/30 px-1 mt-3">
                                    <span>{group.icon}</span>
                                    <span>{group.name}</span>
                                </div>
                                <div className="space-y-1">
                                    {group.courses.map(course => (
                                        <div key={course.id} className="space-y-1">
                                            {/* Course Row */}
                                            <div 
                                                onClick={() => { setSelectedCourse(course); setSelectedSubject(null); setSelectedChapter(null); setPages([]); }}
                                                className={`flex items-center justify-between p-2 rounded-xl border text-sm font-medium transition-all cursor-pointer group ${selectedCourse?.id === course.id ? "bg-white/8 border-white/20 text-white" : "bg-transparent border-transparent text-white/70 hover:bg-white/5 hover:text-white"}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{course.icon}</span>
                                                    <span className="truncate">{course.name}</span>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id, group.name); }} 
                                                    disabled={!s3Configured}
                                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all disabled:opacity-0"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Subjects of Selected Course */}
                                            {selectedCourse?.id === course.id && (
                                                <div className="pl-6 space-y-1 border-l border-white/5 ml-4 my-1">
                                                    <div className="flex items-center justify-between pt-1 pb-1">
                                                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Subjects</span>
                                                        <button 
                                                            onClick={() => setShowAddSubject(true)} 
                                                            disabled={!s3Configured}
                                                            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/60 transition-all disabled:opacity-40"
                                                        >
                                                            + Subject
                                                        </button>
                                                    </div>

                                                    {course.subjects.length === 0 ? (
                                                        <p className="text-[11px] text-white/30 italic py-1 pl-1">No subjects defined</p>
                                                    ) : (
                                                        course.subjects.map(subject => (
                                                            <div key={subject.id} className="space-y-1">
                                                                {/* Subject Row */}
                                                                <div 
                                                                    onClick={() => {
                                                                        if (selectedSubject?.id === subject.id) {
                                                                            setSelectedSubject(null);
                                                                        } else {
                                                                            setSelectedSubject(subject);
                                                                        }
                                                                        setSelectedChapter(null);
                                                                        setPages([]);
                                                                    }}
                                                                    className={`flex items-center justify-between p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer group ${selectedSubject?.id === subject.id ? "bg-white/5 border-white/15 text-white" : "bg-transparent border-transparent text-white/50 hover:bg-white/5 hover:text-white"}`}
                                                                >
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `#${subject.color.toString(16)}` }} />
                                                                        <span className="truncate">{subject.name}</span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }} 
                                                                        disabled={!s3Configured}
                                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all disabled:opacity-0"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>

                                                                {/* Chapters of Selected Subject */}
                                                                {selectedSubject?.id === subject.id && (
                                                                    <div className="pl-4 space-y-1 my-1">
                                                                        <div className="flex items-center justify-between py-1">
                                                                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Chapters</span>
                                                                            <button 
                                                                                onClick={() => setShowAddChapter(true)} 
                                                                                disabled={!s3Configured}
                                                                                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/60 transition-all disabled:opacity-40"
                                                                            >
                                                                                + Chapter
                                                                            </button>
                                                                        </div>

                                                                        {(() => {
                                                                            const subChapters = course.chapters[subject.id];
                                                                            if (!subChapters || !subChapters.rows || subChapters.rows.length === 0) {
                                                                                return <p className="text-[10px] text-white/30 italic py-1 pl-1">No chapters</p>;
                                                                            }
                                                                            return subChapters.rows.map(row => (
                                                                                <div key={row.title} className="space-y-0.5">
                                                                                    <div className="text-[9px] text-white/20 font-bold px-1 py-0.5">{row.title}</div>
                                                                                    {row.chapters.map(chapter => (
                                                                                        <div 
                                                                                            key={chapter.id}
                                                                                            onClick={() => setSelectedChapter(chapter)}
                                                                                            className={`flex items-center justify-between p-1 pl-2 rounded text-[11px] font-semibold transition-all cursor-pointer group ${selectedChapter?.id === chapter.id ? "bg-white/5 text-indigo-400" : "bg-transparent text-white/40 hover:bg-white/5 hover:text-white"}`}
                                                                                        >
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <span>{chapter.icon}</span>
                                                                                                <span className="truncate">{chapter.title}</span>
                                                                                                {chapter.hasPdf && (
                                                                                                    <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 rounded uppercase tracking-wide scale-90">PDF</span>
                                                                                                )}
                                                                                            </div>
                                                                                            <button 
                                                                                                onClick={(e) => { e.stopPropagation(); handleDeleteChapter(chapter.id, row.title); }} 
                                                                                                disabled={!s3Configured}
                                                                                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all disabled:opacity-0"
                                                                                            >
                                                                                                <Trash2 className="w-2.5 h-2.5" />
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ));
                                                                        })()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right Column: Editor Pages */}
                    <div className="lg:col-span-8 space-y-6">
                        {selectedChapter ? (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                                                    <div>
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="text-xl">{selectedChapter.icon}</span>
                                                                            <h3 className="text-lg font-bold text-white">{selectedChapter.title}</h3>
                                                                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold tracking-wide uppercase border border-indigo-500/20">{selectedChapter.badge}</span>
                                                                            {selectedChapter.hasPdf && (
                                                                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold tracking-wide uppercase border border-emerald-500/20">S3 PDF Active</span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-white/40 mt-1">{selectedChapter.desc}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <label 
                                                                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/20 text-emerald-300 transition-all cursor-pointer ${(uploadingPdf || !s3Configured) ? "opacity-40 pointer-events-none" : ""}`}
                                                                        >
                                                                            {uploadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                                                            Upload PDF
                                                                            <input 
                                                                                type="file" 
                                                                                accept=".pdf" 
                                                                                onChange={handlePdfUpload} 
                                                                                className="hidden" 
                                                                                disabled={uploadingPdf || !s3Configured}
                                                                            />
                                                                        </label>
                                                                        <button 
                                                                            onClick={handleAddPage} 
                                                                            disabled={loadingPages || !s3Configured}
                                                                            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 disabled:opacity-40 transition-all"
                                                                        >
                                                                            <Plus className="w-3.5 h-3.5" /> Add Spread
                                                                        </button>
                                                                        <button 
                                                                            onClick={savePages} 
                                                                            disabled={loadingPages || savingPages || !s3Configured}
                                                                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all shadow-md shadow-indigo-600/10"
                                                                        >
                                                                            {savingPages ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                                            Save Pages
                                                                        </button>
                                                                    </div>
                                                                </div>

                                {loadingPages ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                                        <span className="text-xs text-white/30 mt-2 font-medium">Fetching pages content from S3...</span>
                                    </div>
                                ) : (selectedChapter.hasPdf && pages.length === 0) ? (
                                    <div className="flex flex-col items-center justify-center py-16 bg-emerald-500/3 border border-emerald-500/10 border-dashed rounded-xl">
                                        <FileText className="w-10 h-10 text-emerald-400/50" />
                                        <span className="text-sm font-semibold text-emerald-300 mt-3">PDF Document Active</span>
                                        <span className="text-xs text-white/35 mt-1 text-center px-4">PDF has been uploaded successfully. This chapter will render using the PDF inside the 3D Reader.</span>
                                        <span className="text-[10px] font-mono text-white/25 mt-3 bg-white/3 px-2.5 py-1 rounded select-all border border-white/5">
                                            study-materials/{selectedCourse?.id}/{selectedSubject?.id}/{selectedChapter.id}/document.pdf
                                        </span>
                                        <div className="flex items-center gap-3 mt-4">
                                            <a 
                                                href={`/api/study-materials/pdf?course=${selectedCourse?.id}&subject=${selectedSubject?.id}&chapter=${selectedChapter.id}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5" /> View PDF
                                            </a>
                                            <button 
                                                onClick={handleDeletePdf} 
                                                disabled={deletingPdf}
                                                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors"
                                            >
                                                {deletingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                Delete PDF
                                            </button>
                                        </div>
                                    </div>
                                ) : pages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 bg-white/3 border border-white/5 border-dashed rounded-xl">
                                        <FileText className="w-10 h-10 text-white/20" />
                                        <span className="text-sm font-semibold text-white/50 mt-3">This chapter is currently empty</span>
                                        <span className="text-xs text-white/30 mt-1">Click &quot;Add Spread&quot; above to create the first book page layout.</span>
                                    </div>
                                ) : (
                                    <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
                                        {pages.map((page, index) => (
                                            <div key={index} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden p-4 space-y-4">
                                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Spread {index + 1} (Page {index * 2 + 1} &amp; {index * 2 + 2})</span>
                                                    <button 
                                                        onClick={() => handleDeletePage(index)}
                                                        className="p-1 rounded-md hover:bg-red-500/15 text-red-400 hover:text-red-300 transition-colors"
                                                        title="Delete Page Spread"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                {/* Pages layout columns */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Left Page Editor */}
                                                    <div className="bg-[#0f0f19] border border-white/5 rounded-xl p-3.5 space-y-3">
                                                        <div className="text-xs font-bold text-white/40">LEFT PAGE (Page {index * 2 + 1})</div>
                                                        <div className="space-y-2">
                                                            <input 
                                                                type="text" 
                                                                value={page.left.title}
                                                                onChange={(e) => updatePageField(index, "left", "title", e.target.value)}
                                                                placeholder="Left Page Title"
                                                                className="w-full text-sm font-bold bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder-white/30 outline-none focus:border-indigo-500 transition-colors"
                                                            />
                                                            <textarea 
                                                                value={page.left.content}
                                                                onChange={(e) => updatePageField(index, "left", "content", e.target.value)}
                                                                placeholder="Left Page Content (HTML supported)"
                                                                rows={8}
                                                                className="w-full text-xs font-mono bg-white/5 border border-white/10 rounded-lg p-3 text-white/80 placeholder-white/30 outline-none focus:border-indigo-500 transition-colors resize-y"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Right Page Editor */}
                                                    <div className="bg-[#0f0f19] border border-white/5 rounded-xl p-3.5 space-y-3">
                                                        <div className="text-xs font-bold text-white/40">RIGHT PAGE (Page {index * 2 + 2})</div>
                                                        <div className="space-y-2">
                                                            <input 
                                                                type="text" 
                                                                value={page.right.title}
                                                                onChange={(e) => updatePageField(index, "right", "title", e.target.value)}
                                                                placeholder="Right Page Title"
                                                                className="w-full text-sm font-bold bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder-white/30 outline-none focus:border-indigo-500 transition-colors"
                                                            />
                                                            <textarea 
                                                                value={page.right.content}
                                                                onChange={(e) => updatePageField(index, "right", "content", e.target.value)}
                                                                placeholder="Right Page Content (HTML supported)"
                                                                rows={8}
                                                                className="w-full text-xs font-mono bg-white/5 border border-white/10 rounded-lg p-3 text-white/80 placeholder-white/30 outline-none focus:border-indigo-500 transition-colors resize-y"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
                                <BookOpen className="w-12 h-12 text-white/20 animate-pulse" />
                                <h3 className="text-base font-bold text-white mt-4">Select a Chapter to Edit Content</h3>
                                <p className="text-xs text-white/40 mt-1 max-w-xs">
                                    Click through the courses tree on the left, expand a subject, and select a chapter to load and manage book pages in S3.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Add Course */}
            {showAddCourse && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f0f19] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
                        <h3 className="text-lg font-bold">Add Course Folder</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Group Category</label>
                                <select 
                                    value={newCourse.groupName}
                                    onChange={e => setNewCourse({ ...newCourse, groupName: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                                >
                                    <option value="Engineering" className="bg-[#0f0f19]">Engineering</option>
                                    <option value="Competitive Exams" className="bg-[#0f0f19]">Competitive Exams</option>
                                    <option value="Humanities & Social Sciences" className="bg-[#0f0f19]">Humanities &amp; Social Sciences</option>
                                    <option value="Sciences" className="bg-[#0f0f19]">Sciences</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Course ID (unique S3 folder name)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. cs_engineering"
                                    value={newCourse.id}
                                    onChange={e => setNewCourse({ ...newCourse, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Course Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Computer Science"
                                    value={newCourse.name}
                                    onChange={e => setNewCourse({ ...newCourse, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-white/40 uppercase mb-1">Emoji Icon</label>
                                    <input 
                                        type="text" 
                                        value={newCourse.icon}
                                        onChange={e => setNewCourse({ ...newCourse, icon: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-indigo-500 text-center"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-white/40 uppercase mb-1">Theme Color Hex</label>
                                    <input 
                                        type="color" 
                                        value={newCourse.themeColor}
                                        onChange={e => setNewCourse({ ...newCourse, themeColor: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg h-9 p-1 text-white outline-none focus:border-indigo-500 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button onClick={() => setShowAddCourse(false)} className="px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-white/5 text-white/70">Cancel</button>
                            <button onClick={handleAddCourse} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white">Create Course</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Add Subject */}
            {showAddSubject && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f0f19] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
                        <h3 className="text-lg font-bold">Add Subject (to {selectedCourse?.name})</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Subject ID (unique S3 folder name)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. dsa"
                                    value={newSubject.id}
                                    onChange={e => setNewSubject({ ...newSubject, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Subject Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Data Structures"
                                    value={newSubject.name}
                                    onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-white/40 uppercase mb-1">Sidebar Color Hex</label>
                                    <input 
                                        type="color" 
                                        value={"#" + newSubject.color}
                                        onChange={e => setNewSubject({ ...newSubject, color: e.target.value.replace("#", "") })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg h-9 p-1 text-white outline-none focus:border-indigo-500 cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Description</label>
                                <textarea 
                                    placeholder="Brief summary of this subject..."
                                    value={newSubject.desc}
                                    onChange={e => setNewSubject({ ...newSubject, desc: e.target.value })}
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button onClick={() => setShowAddSubject(false)} className="px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-white/5 text-white/70">Cancel</button>
                            <button onClick={handleAddSubject} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white">Create Subject</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Add Chapter */}
            {showAddChapter && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f0f19] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
                        <h3 className="text-lg font-bold">Add Chapter (to {selectedSubject?.name})</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Shelf Row Category</label>
                                <select 
                                    value={newChapter.rowTitle}
                                    onChange={e => setNewChapter({ ...newChapter, rowTitle: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                                >
                                    <option value="Core Materials" className="bg-[#0f0f19]">Core Materials</option>
                                    <option value="Advanced & Specialized" className="bg-[#0f0f19]">Advanced &amp; Specialized</option>
                                    <option value="Practical & Lab Prep" className="bg-[#0f0f19]">Practical &amp; Lab Prep</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Chapter ID (unique S3 folder name)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. arrays"
                                    value={newChapter.id}
                                    onChange={e => setNewChapter({ ...newChapter, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Chapter Title</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Arrays &amp; Vectors"
                                    value={newChapter.title}
                                    onChange={e => setNewChapter({ ...newChapter, title: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-white/40 uppercase mb-1">Emoji Icon</label>
                                    <input 
                                        type="text" 
                                        value={newChapter.icon}
                                        onChange={e => setNewChapter({ ...newChapter, icon: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-indigo-500 text-center"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-white/40 uppercase mb-1">Badge Tag</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Core / Advanced"
                                        value={newChapter.badge}
                                        onChange={e => setNewChapter({ ...newChapter, badge: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Short Description</label>
                                <textarea 
                                    placeholder="Short description displayed on the book shelf cover..."
                                    value={newChapter.desc}
                                    onChange={e => setNewChapter({ ...newChapter, desc: e.target.value })}
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button onClick={() => setShowAddChapter(false)} className="px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-white/5 text-white/70">Cancel</button>
                            <button onClick={handleAddChapter} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white">Create Chapter</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
