import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTreeAccess } from "@/lib/access";
import { Resend } from "resend";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: treeId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTreeAccess(session.user.id, session.user.systemRole, treeId);
  if (role !== "ADMIN" && role !== "OWNER") {
    return NextResponse.json({ error: "Only the tree owner can invite collaborators." }, { status: 403 });
  }

  const { email, role: inviteRole } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const normalizedEmail = email.trim().toLowerCase();

  // If the invitee already has an account, add them directly instead of a pending invite.
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    const member = await prisma.treeMember.upsert({
      where: { treeId_userId: { treeId, userId: existingUser.id } },
      create: { treeId, userId: existingUser.id, role: inviteRole ?? "EDITOR" },
      update: { role: inviteRole ?? "EDITOR" },
    });
    return NextResponse.json({ status: "added", member });
  }

  // Fetch tree name to include in the email subject/body.
  const tree = await prisma.tree.findUnique({ where: { id: treeId }, select: { name: true } });

  const invite = await prisma.invite.create({
    data: {
      treeId,
      email: normalizedEmail,
      role: inviteRole ?? "EDITOR",
      invitedById: session.user.id,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${invite.token}`;
  const inviterName = session.user.name ?? session.user.email ?? "Someone";
  const treeName = tree?.name ?? "a family tree";
  const roleLabel = (inviteRole ?? "EDITOR").charAt(0) + (inviteRole ?? "EDITOR").slice(1).toLowerCase();

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Family Tree <onboarding@resend.dev>",
      to: normalizedEmail,
      subject: `${inviterName} invited you to collaborate on "${treeName}"`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="margin:0 0 8px">You've been invited</h2>
          <p style="color:#57606a;margin:0 0 24px">
            <strong>${inviterName}</strong> has invited you to collaborate on
            <strong>${treeName}</strong> as an <strong>${roleLabel}</strong>.
          </p>
          <a href="${inviteUrl}"
             style="display:inline-block;padding:12px 24px;background:#3b82d4;color:#fff;
                    text-decoration:none;border-radius:6px;font-weight:600">
            Accept invitation
          </a>
          <p style="color:#57606a;font-size:13px;margin:24px 0 0">
            Or copy this link:<br/>
            <a href="${inviteUrl}" style="color:#3b82d4">${inviteUrl}</a>
          </p>
          <p style="color:#57606a;font-size:12px;margin:16px 0 0">
            If you weren't expecting this invitation you can safely ignore this email.
          </p>
        </div>
      `,
    });
  }

  return NextResponse.json({ status: "pending", invite });
}
