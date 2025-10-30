-- Fix groupMembers table columns to camelCase
ALTER TABLE "groupMembers" RENAME COLUMN leftat TO "leftAt";
ALTER TABLE "groupMembers" RENAME COLUMN isactive TO "isActive";
ALTER TABLE "groupMembers" RENAME COLUMN invitedby TO "invitedBy";
ALTER TABLE "groupMembers" RENAME COLUMN permissions TO "permissions";
ALTER TABLE "groupMembers" RENAME COLUMN lastseenat TO "lastSeenAt";
ALTER TABLE "groupMembers" RENAME COLUMN createdat TO "createdAt";
ALTER TABLE "groupMembers" RENAME COLUMN updatedat TO "updatedAt";
ALTER TABLE "groupMembers" RENAME COLUMN deletedat TO "deletedAt";

-- Create trigger for updatedAt
DROP TRIGGER IF EXISTS update_group_members_updated_at ON "groupMembers";
CREATE TRIGGER update_group_members_updated_at
  BEFORE UPDATE ON "groupMembers"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
