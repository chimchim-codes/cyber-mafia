import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, AlertTriangle, ShieldCheck, User } from 'lucide-react';
import { api } from '../../api/client';

export default function TicketDrawer({ isOpen, onClose, conversation, onTicketUpdated }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Open');
  const [priority, setPriority] = useState('Medium');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadTicket() {
      if (!conversation?.ticketId && !conversation?._id) return;
      setLoading(true);
      try {
        const ticketId = typeof conversation.ticketId === 'object' ? conversation.ticketId._id : conversation.ticketId;
        if (ticketId) {
          const res = await api.tickets.list();
          const match = res.tickets?.find((t) => t._id === ticketId);
          if (match) {
            setTicket(match);
            setStatus(match.status);
            setPriority(match.priority);
          }
        }
      } catch (err) {
        console.error('Failed to load ticket:', err);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      loadTicket();
    }
  }, [isOpen, conversation]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!ticket?._id) return;
    setSaving(true);
    try {
      const res = await api.tickets.update(ticket._id, { status, priority });
      if (res.success && res.ticket) {
        setTicket(res.ticket);
        if (onTicketUpdated) onTicketUpdated(res.ticket);
      }
    } catch (err) {
      console.error('Failed to update ticket:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-left border-l border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">Support Ticket Details</h3>
              <p className="text-[11px] font-mono text-slate-500">{ticket?.ticketNumber || 'Ticket #TICK-PENDING'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading ticket details...</div>
          ) : !ticket ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto opacity-30" />
              <p>No support ticket currently attached to this conversation.</p>
            </div>
          ) : (
            <>
              {/* Subject */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium">
                  {ticket.subject}
                </div>
              </div>

              {/* Customer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer</label>
                  <p className="text-slate-800">{ticket.customerName || 'Customer'}</p>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <p className="text-slate-800">{ticket.customerEmail || 'Not provided'}</p>
                </div>
              </div>

              {/* Status and Priority selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ticket Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting on Customer">Waiting on Customer</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Inquiry / Description</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed min-h-20">
                  {ticket.description || 'No additional description logged.'}
                </div>
              </div>

              {/* Escalation Reason */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Escalation Trigger</label>
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{ticket.escalationReason || 'Automatic AI escalation threshold'}</span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
                <p>Created: {new Date(ticket.createdAt).toLocaleString()}</p>
                <p>Last Updated: {new Date(ticket.updatedAt).toLocaleString()}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {ticket && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-xs cursor-pointer text-xs transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
