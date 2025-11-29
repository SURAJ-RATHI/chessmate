import PropTypes from "prop-types";
import {
	Layout,
	Divider,
	Menu,
	Button,
	Grid,
	Row,
	Col,
	Space,
	// theme
} from "antd";
import {
	MenuFoldOutlined,
	MenuUnfoldOutlined,
	LogoutOutlined,
	// TeamOutlined,
	EditOutlined,
	ProfileOutlined,
	// SendOutlined,
	BulbOutlined,
} from "@ant-design/icons";
const { Header, Content } = Layout;
import { useState, useRef } from "react";
import { useAuthContext } from "../hooks/useAuthContext";
import useHashLocation from "../hooks/useHashLocation";
import { useLogout } from "../hooks/useLogout";

function BaseLayout({ children, handleThemeChange }) {
	// const {token} = theme.useToken();
	const [, hashNavigate] = useHashLocation();
	const [collapsed, setCollapsed] = useState(true);
	const [logout] = useLogout();
	const screens = Grid.useBreakpoint();
	const { user } = useAuthContext();
	const handleMenuCollapseOnClick = () => {
		if (screens.xs === true) {
			setCollapsed(!collapsed);
		} else {
			setCollapsed(collapsed);
		}
	};

	const activePage = useRef([]);
	const handleActivePage = (key) => {
		activePage.current = key;
	};

	const handleOnTabClick = (e) => {
		if (e.key == "1") {
			handleActivePage([e.key]);
			hashNavigate("/register");
			handleMenuCollapseOnClick();
		}
		if (e.key == "2") {
			handleActivePage([e.key]);
			hashNavigate("/login");
			handleMenuCollapseOnClick();
		}
	};
	return (
		<>
			<Layout
				style={{
					minHeight: "100vh",
					minWidth: "100vw",
					// maxWidth: "100vw"
				}}
			>
				<Header
					style={{
						padding: "0 24px",
						display: "flex",
						alignItems: "center",
						background: "#0b1220",
						borderBottom: "1px solid rgba(148, 163, 184, 0.25)",
					}}
				>
					<Row
						align="middle"
						justify="space-between"
						style={{ width: "100%" }}
					>
						<Col flex="none">
							<div className="brand">
								<img
									src="/chess.svg"
									width={32}
									height={32}
									alt="Chessmate logo"
								/>
								<span className="brand-name">Chessmate</span>
							</div>
						</Col>

						<Col flex="none">
							<Button
								type="text"
								icon={
									collapsed ? (
										<MenuUnfoldOutlined />
									) : (
										<MenuFoldOutlined />
									)
								}
								onClick={() => setCollapsed(!collapsed)}
								style={{
									color: "#f8f9fa",
									display: !screens.xs || user ? "none" : "",
									width: 64,
									height: 64,
								}}
							/>
						</Col>

						<Col flex="none">
							<Space align="center" size="middle">
								<Button
									type="text"
									icon={<BulbOutlined />}
									aria-label="Toggle theme"
									style={{
										color: "#e5e7eb",
										width: 40,
										height: 40,
									}}
									onClick={handleThemeChange}
								/>
								<Button
									type="text"
									icon={<LogoutOutlined />}
									style={{
										color: "#f8f9fa",
										display: !user ? "none" : "",
										width: 40,
										height: 40,
									}}
									onClick={logout}
								/>
								<Space
									size="small"
									style={{
										display: screens.xs || user ? "none" : "",
									}}
								>
									<Button
										type="primary"
										style={{
											boxShadow: "none",
											borderRadius: 999,
											paddingInline: 18,
										}}
										onClick={() => {
											hashNavigate("/login");
										}}
									>
										Login
									</Button>
									<Button
										style={{
											borderRadius: 999,
											paddingInline: 18,
										}}
										onClick={() => {
											hashNavigate("/register");
										}}
									>
										Register
									</Button>
								</Space>
							</Space>
						</Col>
					</Row>
				</Header>
				<Divider style={{ margin: 0 }} />
				<Menu
					theme="light"
					mode={screens.xs ? "vertical" : "horizontal"}
					style={collapsed || !screens.xs ? { display: "none" } : {}}
					onClick={handleOnTabClick}
					selectedKeys={activePage.current}
					items={[
						{
							key: "1",
							icon: <ProfileOutlined />,
							label: "Register",
						},
						{
							key: "2",
							icon: <EditOutlined />,
							label: "Login",
						},
					]}
				/>
				<Content
					style={{
						// margin: "16px 16px",
						padding: 16,
						minHeight: "100vw -64px",
						// minWidth: "100vw -64px"
					}}
				>
					{children}
				</Content>
			</Layout>
		</>
	);
}

BaseLayout.propTypes = {
	children: PropTypes.node.isRequired,
	handleThemeChange: PropTypes.func,
};

export default BaseLayout;
