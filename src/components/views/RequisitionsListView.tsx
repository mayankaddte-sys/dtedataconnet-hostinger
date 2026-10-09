                              ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                              : fieldSubmission?.status === 'SUBMITTED'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {fieldSubmission?.status === 'APPROVED' 
                              ? 'Approved Data देखें'
                              : fieldSubmission?.status === 'REVISION_REQUESTED'
                              ? 'Revision / सुधार भरें'
                              : fieldSubmission?.status === 'SUBMITTED'
                              ? 'Submission देखें / Edit'
                              : 'डेटा Return भरें'}
                          </span>
                        </button>
                      )}

                      {/* View Detail Button */}
                      <button
                        onClick={() => onSelectRequisition(req)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 border border-slate-200"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>

                      {/* Directorate Delete Button */}
                      {isDirectorate && onDeleteRequisition && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingReq(req);
                          }}
                          className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg transition-colors border border-rose-200 hover:border-rose-600 shadow-2xs"
                          title="मांग आदेश विलोपित करें (Delete Order)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Requisition Confirmation Modal */}
      {deletingReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 pb-3 border-b border-slate-100">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">मांग आदेश विलोपन (Delete Order)</h3>
                <p className="text-xs text-slate-500">निदेशालय स्तर पर सूचना मांग आदेश विलोपित करें</p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <p>
                क्या आप निम्नलिखित डेटा मांग आदेश को स्थायी रूप से विलोपित करना चाहते हैं?
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div><span className="font-bold text-slate-800">मांग सं.:</span> <span className="font-mono text-indigo-700 font-bold">{deletingReq.requisitionNumber}</span></div>
                <div><span className="font-bold text-slate-800">विषय:</span> {deletingReq.title}</div>
                <div><span className="font-bold text-slate-800">प्रकोष्ठ:</span> {deletingReq.deskName}</div>
                <div><span className="font-bold text-slate-800">लक्षित इकाइयां:</span> {deletingReq.targetUnitIds.length}</div>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-rose-900 text-[11px] leading-relaxed">
                <strong>सावधानी:</strong> इस आदेश को हटाने पर इससे संबंधित सभी <strong>सबमिशन रिपोर्ट्स</strong>, विस्तार अनुरोध तथा निर्गत नोटिस भी स्वतः हटा दिए जाएंगे।
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeletingReq(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                रद्द करें (Cancel)
              </button>
              <button
                onClick={() => {
                  if (onDeleteRequisition) {
                    onDeleteRequisition(deletingReq.id);
                  }
                  setDeletingReq(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>हां, आदेश विलोपित करें</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
