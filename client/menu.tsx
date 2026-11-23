import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@getpaseo/plugin/client/ui";
import { useHover, useSidebar } from "./context";

/**
 * Menus open inline below their trigger. Plugins have no popover or portal, and an inline card
 * cannot be clipped or painted over on any platform. The card copies the built-in dropdown.
 */
export function MenuCard({ children, inset = 0 }: { children: ReactNode; inset?: number }) {
  const { theme, palette } = useSidebar();
  return (
    <View
      style={{
        marginLeft: inset,
        marginTop: 2,
        marginBottom: 6,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: palette.borderAccent,
        backgroundColor: theme.colors.surface1,
        shadowColor: "#000000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      {children}
    </View>
  );
}

export function MenuItem({
  icon,
  label,
  onPress,
  checked,
  value,
  submenu,
  disabled,
  destructive,
  leading,
}: {
  icon?: string;
  label: string;
  onPress?: () => void;
  /** Shows a check mark at the end. */
  checked?: boolean;
  /** A current value shown at the end, for rows that open a sub-page. */
  value?: string;
  submenu?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  /** Custom leading content instead of an icon. */
  leading?: ReactNode;
}) {
  const { theme, touch } = useSidebar();
  const hover = useHover();
  const color = destructive ? theme.colors.statusDanger : theme.colors.foreground;
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, checked: checked ?? undefined }}
      disabled={disabled}
      onPress={onPress}
      onHoverIn={hover.onHoverIn}
      onHoverOut={hover.onHoverOut}
      style={({ pressed }) => ({
        minHeight: touch ? 44 : 28,
        marginHorizontal: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        opacity: disabled ? 0.5 : 1,
        backgroundColor: pressed || hover.hovered ? theme.colors.surface2 : "transparent",
      })}
    >
      {leading ??
        (icon ? (
          <Icon name={icon} size={14} color={destructive ? color : theme.colors.foregroundMuted} />
        ) : null)}
      <Text numberOfLines={1} style={{ flex: 1, color, fontSize: 14, lineHeight: 20 }}>
        {label}
      </Text>
      {value ? (
        <Text
          numberOfLines={1}
          style={{ color: theme.colors.foregroundMuted, fontSize: 12, maxWidth: 110 }}
        >
          {value}
        </Text>
      ) : null}
      {checked ? <Icon name="Check" size={14} color={theme.colors.foreground} /> : null}
      {submenu ? <Icon name="ChevronRight" size={14} color={theme.colors.foregroundMuted} /> : null}
    </Pressable>
  );
}

export function MenuSeparator() {
  const { theme } = useSidebar();
  return <View style={{ height: 1, marginVertical: 4, backgroundColor: theme.colors.border }} />;
}

/** The first row of a sub-page: returns to the parent page. */
export function MenuBack({ title, onPress }: { title: string; onPress: () => void }) {
  return <MenuItem icon="ChevronLeft" label={title} onPress={onPress} />;
}

export function MenuNote({ text }: { text: string }) {
  const { theme } = useSidebar();
  return (
    <Text
      style={{
        color: theme.colors.statusDanger,
        fontSize: 12,
        lineHeight: 16,
        paddingHorizontal: 12,
        paddingVertical: 4,
      }}
    >
      {text}
    </Text>
  );
}
