                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
              >
                + Create First Demand Order
              </button>
            </div>
          ) : (
            filteredRequisitions.map((req) => {
              const receivedCount = receivedFromTargets(req, submissions);
              const targetCount = req.targetUnitIds.length;
              const compliancePct = targetCount > 0 ? Math.min(100, Math.round((receivedCount / targetCount) * 100)) : 0;
              const pendingCount = Math.max(0, targetCount - receivedCount);

              return (
                <div
                  key={req.id}
                  onClick={() => onSelectRequisition(req)}
                  className="p-5 hover:bg-slate-50/80 transition-all cursor-pointer group flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {req.requisitionNumber}
                      </span>
                      <PriorityBadge priority={req.priority} isAssemblyQuestion={req.isAssemblyQuestion} size="sm" />
                      <span className="text-xs text-slate-500 font-medium">
                        Mode: <strong className="text-slate-700">
                          {req.mode === 'GOOGLE_SHEET' ? 'Google Sheet' : req.mode === 'GOOGLE_FORM' ? 'Google Form' : 'Portal Form'}
                        </strong>
                      </span>
                      {req.isStrictCutoff && (
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded">
                          Auto-Lock Window
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {req.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-1">
                      {req.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Deadline: <strong className="text-slate-800">{formatDateTime(req.deadline)}</strong>
                      </span>
                      <span>•</span>
                      <span>Target: <strong className="text-slate-700">
                        {req.targetScope === 'ALL_FIELD_UNITS' || req.targetScope === ('ALL_UNITS' as any)
                          ? 'All Units (JDs + ITIs)' 
                          : req.targetScope === 'ALL_ITIS' 
                          ? 'All ITIs' 
                          : req.targetScope === 'ALL_JD_OFFICES' 
                          ? 'All JD Offices' 
                          : req.targetScope === 'SELECTED_JD_OFFICES'
                          ? 'Selected JDs (Mandal)'
                          : req.targetScope === 'SELECTED_ITIS'
                          ? 'Selected ITIs'
                          : 'Selected Units'}
                      </strong> ({targetCount} Units)</span>
                    </div>
                  </div>

                  {/* Right compliance stat & countdown */}
                  <div className="flex items-center gap-6 self-end lg:self-center shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 w-full lg:w-auto justify-between lg:justify-end">
                    
                    {/* Compliance Mini Progress */}
                    <div className="w-40 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px] font-medium">Compliance Rate</span>
                        <span className="font-bold text-slate-900">{compliancePct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            compliancePct >= 80 ? 'bg-emerald-500' : compliancePct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${compliancePct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 text-right">
                        {receivedCount}/{targetCount} Received ({pendingCount} Pending)
                      </div>
                    </div>

                    {/* Countdown Badge */}
                    <div className="flex flex-col items-end gap-1">
                      <CountdownTimer deadline={req.deadline} isStrictCutoff={req.isStrictCutoff} compact />
                      <span className="text-xs text-indigo-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Manage & Review <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};
